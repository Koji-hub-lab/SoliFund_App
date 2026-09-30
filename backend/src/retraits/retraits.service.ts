import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationsService,
  type CodeNotification,
  type ParametresNotification,
} from '../notifications/notifications.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';
import { RejectRetraitDto } from './dto/reject-retrait.dto';
import { ListerRetraitsDto } from './dto/lister-retraits.dto';
import { construirePage, lirePagination } from '../common/pagination';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { calculerCommission, tauxCommission } from './commission';

import { derniereVerification } from '../verification-identite/identite';
import { m } from '../i18n/messages';

@Injectable()
export class RetraitsService {
  private readonly logger = new Logger(RetraitsService.name);

  // Taux de commission en vigueur : appliqué aux nouvelles demandes, puis figé dans chaque retrait.
  private readonly tauxCommission: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    config: ConfigService,
  ) {
    this.tauxCommission = tauxCommission(config);
  }

  // Prévient l'organisateur. Appelée après la transaction : un échec d'envoi ne doit pas
  // faire croire à l'admin que le traitement a échoué.
  private async notifierOrganisateur(
    retrait: {
      id_retrait: number;
      id_utilisateur: number;
      id_cagnotte: number;
    },
    code: CodeNotification,
    parametres: ParametresNotification,
  ) {
    try {
      await this.notificationsService.envoyer(
        retrait.id_utilisateur,
        code,
        parametres,
        'RETRAIT',
        retrait.id_cagnotte,
      );
    } catch (e) {
      this.logger.warn(
        `Notification non envoyée (retrait ${retrait.id_retrait}) : ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  // Montant BRUT déjà engagé en retraits (EN_ATTENTE, APPROUVE, TRAITE) pour chaque cagnotte
  // demandée : le disponible d'une cagnotte se calcule toujours sur le brut (commission comprise).
  // `client` permet d'appeler la méthode dans une transaction (voir demander()).
  // Renvoie une Map id_cagnotte -> montant ; une cagnotte sans retrait vaut 0.
  async montantsEngages(
    idsCagnottes: number[],
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<Map<number, number>> {
    const engages = new Map<number, number>(idsCagnottes.map((id) => [id, 0]));
    if (idsCagnottes.length === 0) return engages;
    const lignes = await client.retrait.groupBy({
      by: ['id_cagnotte'],
      where: {
        id_cagnotte: { in: idsCagnottes },
        statut: { in: ['EN_ATTENTE', 'APPROUVE', 'TRAITE'] },
      },
      _sum: { montant_brut: true },
    });
    for (const ligne of lignes) {
      engages.set(ligne.id_cagnotte, Number(ligne._sum.montant_brut ?? 0));
    }
    return engages;
  }

  // L'identité de l'organisateur doit être vérifiée. Le retrait est toujours versé sur le numéro
  // et l'opérateur de cette vérification : ils ne se choisissent pas dans la demande.
  async demander(idUtilisateur: number, dto: CreateRetraitDto) {
    return this.prisma.$transaction(async (tx) => {
      const identite = await derniereVerification(tx, idUtilisateur);
      if (identite?.statut !== 'VALIDEE') {
        throw new ForbiddenException(
          identite?.statut === 'EN_ATTENTE'
            ? m('retraits.identiteEnAttente')
            : m('retraits.identiteRequise'),
        );
      }

      // Verrouille la ligne de la cagnotte : deux demandes simultanées sont sérialisées.
      const lignes = await tx.$queryRaw<
        {
          id_utilisateur: number;
          montant_collecte: unknown;
          statut: string;
          devise: string;
        }[]
      >`SELECT id_utilisateur, montant_collecte, statut::text AS statut, devise
        FROM slf_cagnotte WHERE id_cagnotte = ${dto.id_cagnotte} FOR UPDATE`;
      const cagnotte = lignes[0];
      if (!cagnotte) {
        throw new NotFoundException(m('cagnottes.introuvable'));
      }
      if (cagnotte.id_utilisateur !== idUtilisateur) {
        throw new ForbiddenException(m('cagnottes.pasProprietaire'));
      }
      if (cagnotte.statut === 'SUSPENDUE' || cagnotte.statut === 'ANNULEE') {
        throw new BadRequestException(m('retraits.cagnotteFermee'));
      }

      const totalDejaEngage =
        (await this.montantsEngages([dto.id_cagnotte], tx)).get(
          dto.id_cagnotte,
        ) ?? 0;
      const disponible = Number(cagnotte.montant_collecte) - totalDejaEngage;

      if (dto.montant > disponible) {
        throw new BadRequestException(
          m('retraits.disponibleInsuffisant', {
            disponible,
            devise: cagnotte.devise,
          }),
        );
      }

      return tx.retrait.create({
        data: {
          id_utilisateur: idUtilisateur,
          id_cagnotte: dto.id_cagnotte,
          // Commission figée à la demande : l'historique reste juste si le taux change ensuite.
          montant_brut: dto.montant,
          taux_commission: this.tauxCommission,
          ...calculerCommission(dto.montant, this.tauxCommission),
          methode_retrait: identite.methode_retrait,
          numero_beneficiaire: identite.telephone_retrait,
        },
      });
    });
  }

  async traiter(idRetrait: number) {
    const traite = await this.prisma.$transaction(async (tx) => {
      const retrait = await tx.retrait.findUnique({
        where: { id_retrait: idRetrait },
      });
      if (!retrait) {
        throw new NotFoundException(m('retraits.introuvable'));
      }

      // Mise à jour conditionnelle : si un autre appel l'a déjà traité, count vaut 0.
      const { count } = await tx.retrait.updateMany({
        where: { id_retrait: idRetrait, statut: 'EN_ATTENTE' },
        data: { statut: 'TRAITE', date_traitement: new Date() },
      });
      if (count === 0) {
        throw new BadRequestException(m('retraits.dejaTraite'));
      }

      // Somme réellement versée à l'organisateur : le net.
      await tx.transaction.create({
        data: {
          id_retrait: idRetrait,
          type: 'RETRAIT',
          montant: retrait.montant_net,
          devise: 'XAF',
          statut: 'SUCCES',
        },
      });
      // Registre des commissions : une ligne par retrait versé (sauf commission nulle).
      if (Number(retrait.montant_commission) > 0) {
        await tx.commission.create({
          data: {
            id_retrait: idRetrait,
            id_cagnotte: retrait.id_cagnotte,
            montant: retrait.montant_commission,
            taux: retrait.taux_commission,
          },
        });
      }

      return tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
    });

    if (traite) {
      await this.notifierOrganisateur(traite, 'RETRAIT_TRAITE', {
        brut: Number(traite.montant_brut),
        net: Number(traite.montant_net),
        commission: Number(traite.montant_commission),
        devise: 'XAF',
        numero: traite.numero_beneficiaire,
      });
    }
    return traite;
  }

  async rejeter(idRetrait: number, dto: RejectRetraitDto) {
    const rejete = await this.prisma.$transaction(async (tx) => {
      const retrait = await tx.retrait.findUnique({
        where: { id_retrait: idRetrait },
      });
      if (!retrait) {
        throw new NotFoundException(m('retraits.introuvable'));
      }

      const { count } = await tx.retrait.updateMany({
        where: { id_retrait: idRetrait, statut: 'EN_ATTENTE' },
        data: {
          statut: 'REJETE',
          motif_rejet: dto.motif_rejet,
          date_traitement: new Date(),
        },
      });
      if (count === 0) {
        throw new BadRequestException(m('retraits.dejaTraite'));
      }

      return tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
    });

    if (rejete) {
      await this.notifierOrganisateur(rejete, 'RETRAIT_REJETE', {
        brut: Number(rejete.montant_brut),
        devise: 'XAF',
        motif: rejete.motif_rejet?.trim() ?? '',
      });
    }
    return rejete;
  }

  // Contient les numéros de téléphone des bénéficiaires : réservé au propriétaire ou à un admin.
  async listerParCagnotte(
    idCagnotte: number,
    idUtilisateur: number,
    estAdmin: boolean,
  ) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: idCagnotte },
      select: { id_utilisateur: true },
    });
    if (!cagnotte) {
      throw new NotFoundException(m('cagnottes.introuvable'));
    }
    if (cagnotte.id_utilisateur !== idUtilisateur && !estAdmin) {
      throw new ForbiddenException(m('cagnottes.pasProprietaire'));
    }

    return this.prisma.retrait.findMany({
      where: { id_cagnotte: idCagnotte },
      orderBy: { date_creation: 'desc' },
    });
  }

  async listerToutes(dto: ListerRetraitsDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where = dto.statut ? { statut: dto.statut } : {};
    const [donnees, total] = await this.prisma.$transaction([
      this.prisma.retrait.findMany({
        where,
        include: {
          cagnotte: { select: { titre: true, devise: true } },
          utilisateur: { select: { nom: true, prenom: true, email: true } },
        },
        orderBy: [
          { statut: 'asc' },
          { date_creation: 'desc' },
          { id_retrait: 'desc' },
        ],
        skip,
        take,
      }),
      this.prisma.retrait.count({ where }),
    ]);
    return construirePage(donnees, total, page, limite);
  }
}
