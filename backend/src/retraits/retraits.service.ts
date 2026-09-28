import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';
import { RejectRetraitDto } from './dto/reject-retrait.dto';
import { ListerRetraitsDto } from './dto/lister-retraits.dto';
import { construirePage, lirePagination } from '../common/pagination';

function formaterMontant(montant: unknown): string {
  return `${Number(montant).toLocaleString('fr-FR')} XAF`;
}

@Injectable()
export class RetraitsService {
  private readonly logger = new Logger(RetraitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Prévient l'organisateur. Appelée après la transaction : un échec d'envoi ne doit pas
  // faire croire à l'admin que le traitement a échoué.
  private async notifierOrganisateur(
    retrait: { id_retrait: number; id_utilisateur: number; id_cagnotte: number },
    titre: string,
    message: string,
  ) {
    try {
      await this.notificationsService.envoyer(retrait.id_utilisateur, titre, message, 'RETRAIT', retrait.id_cagnotte);
    } catch (e) {
      this.logger.warn(`Notification non envoyée (retrait ${retrait.id_retrait}) : ${e instanceof Error ? e.message : e}`);
    }
  }

  async demander(idUtilisateur: number, dto: CreateRetraitDto) {
    return this.prisma.$transaction(async (tx) => {
      // Verrouille la ligne de la cagnotte : deux demandes simultanées sont sérialisées.
      const lignes = await tx.$queryRaw<
        { id_utilisateur: number; montant_collecte: unknown; statut: string; devise: string }[]
      >`SELECT id_utilisateur, montant_collecte, statut::text AS statut, devise
        FROM slf_cagnotte WHERE id_cagnotte = ${dto.id_cagnotte} FOR UPDATE`;
      const cagnotte = lignes[0];
      if (!cagnotte) {
        throw new NotFoundException('Cagnotte introuvable.');
      }
      if (cagnotte.id_utilisateur !== idUtilisateur) {
        throw new ForbiddenException("Tu n'es pas le propriétaire de cette cagnotte.");
      }
      if (cagnotte.statut === 'SUSPENDUE' || cagnotte.statut === 'ANNULEE') {
        throw new BadRequestException('Impossible de demander un retrait sur une cagnotte suspendue ou annulée.');
      }

      const dejaEngage = await tx.retrait.aggregate({
        where: { id_cagnotte: dto.id_cagnotte, statut: { in: ['EN_ATTENTE', 'APPROUVE', 'TRAITE'] } },
        _sum: { montant: true },
      });
      const totalDejaEngage = Number(dejaEngage._sum.montant ?? 0);
      const disponible = Number(cagnotte.montant_collecte) - totalDejaEngage;

      if (dto.montant > disponible) {
        throw new BadRequestException(`Montant disponible insuffisant (${disponible} ${cagnotte.devise}).`);
      }

      return tx.retrait.create({
        data: {
          id_utilisateur: idUtilisateur,
          id_cagnotte: dto.id_cagnotte,
          montant: dto.montant,
          methode_retrait: dto.methode_retrait as any,
          numero_beneficiaire: dto.numero_beneficiaire,
        },
      });
    });
  }

  async traiter(idRetrait: number) {
    const traite = await this.prisma.$transaction(async (tx) => {
      const retrait = await tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
      if (!retrait) {
        throw new NotFoundException('Retrait introuvable.');
      }

      // Mise à jour conditionnelle : si un autre appel l'a déjà traité, count vaut 0.
      const { count } = await tx.retrait.updateMany({
        where: { id_retrait: idRetrait, statut: 'EN_ATTENTE' },
        data: { statut: 'TRAITE', date_traitement: new Date() },
      });
      if (count === 0) {
        throw new BadRequestException('Ce retrait a déjà été traité.');
      }

      await tx.transaction.create({
        data: {
          id_retrait: idRetrait,
          type: 'RETRAIT',
          montant: retrait.montant,
          devise: 'XAF',
          statut: 'SUCCES',
        },
      });

      return tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
    });

    if (traite) {
      await this.notifierOrganisateur(
        traite,
        'Retrait traité',
        `Ton retrait de ${formaterMontant(traite.montant)} a été traité.`,
      );
    }
    return traite;
  }

  async rejeter(idRetrait: number, dto: RejectRetraitDto) {
    const rejete = await this.prisma.$transaction(async (tx) => {
      const retrait = await tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
      if (!retrait) {
        throw new NotFoundException('Retrait introuvable.');
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
        throw new BadRequestException('Ce retrait a déjà été traité.');
      }

      return tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
    });

    if (rejete) {
      const motif = rejete.motif_rejet?.trim() ? `Motif : ${rejete.motif_rejet.trim()}` : 'Aucun motif précisé.';
      await this.notifierOrganisateur(
        rejete,
        'Retrait rejeté',
        `Ton retrait de ${formaterMontant(rejete.montant)} a été rejeté. ${motif}`,
      );
    }
    return rejete;
  }

  // Contient les numéros de téléphone des bénéficiaires : réservé au propriétaire ou à un admin.
  async listerParCagnotte(idCagnotte: number, idUtilisateur: number, estAdmin: boolean) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: idCagnotte },
      select: { id_utilisateur: true },
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    if (cagnotte.id_utilisateur !== idUtilisateur && !estAdmin) {
      throw new ForbiddenException("Tu n'es pas le propriétaire de cette cagnotte.");
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
        orderBy: [{ statut: 'asc' }, { date_creation: 'desc' }, { id_retrait: 'desc' }],
        skip,
        take,
      }),
      this.prisma.retrait.count({ where }),
    ]);
    return construirePage(donnees, total, page, limite);
  }
}