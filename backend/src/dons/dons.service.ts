import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDonDto } from './dto/create-don.dto';
import {
  PaginationDto,
  construirePage,
  lirePagination,
} from '../common/pagination';
import { estEchue } from '../common/dates';
import {
  CagnottesService,
  UtilisateurVisiteur,
} from '../cagnottes/cagnottes.service';

@Injectable()
export class DonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cagnottesService: CagnottesService,
  ) {}

  async creer(idUtilisateur: number, dto: CreateDonDto) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: dto.id_cagnotte },
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    if (cagnotte.statut !== 'ACTIVE') {
      throw new BadRequestException("Cette cagnotte n'accepte plus de dons.");
    }
    // Même règle que la tâche nocturne : dons possibles jusqu'à minuit (Douala) au soir de date_fin.
    if (estEchue(cagnotte.date_fin)) {
      throw new BadRequestException(
        'Cette cagnotte est terminée : la date de fin est dépassée.',
      );
    }

    // Passage d'AangaraaPay à 3SPAY : le client 3SPAY existe (src/paiement-3spay), mais les dons
    // n'y sont pas encore branchés. Aucun don n'est créé en attendant.
    throw new ServiceUnavailableException(
      'Les dons sont momentanément indisponibles : le paiement Mobile Money est en cours de mise à jour. Veuillez réessayer plus tard.',
    );
  }

  async verifierStatutDon(
    idDon: number,
    idUtilisateur: number,
    estAdmin: boolean,
  ) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true, cagnotte: true },
    });
    if (!don) {
      throw new NotFoundException('Don introuvable.');
    }
    if (don.id_utilisateur !== idUtilisateur && !estAdmin) {
      throw new ForbiddenException();
    }
    if (don.statut === 'VALIDE') {
      return { statut: 'VALIDE' };
    }
    // En attendant le branchement de 3SPAY : statut enregistré, sans interroger le prestataire.
    return { statut: don.statut };
  }

  // Endpoint admin : même comportement visible qu'avant (erreur si le don est déjà validé).
  async validerPaiement(idDon: number) {
    const resultat = await this.appliquerValidation(idDon);
    if (!resultat.valide) {
      if (resultat.statut === 'VALIDE') {
        throw new BadRequestException('Ce don est déjà validé.');
      }
      throw new BadRequestException(
        `Ce don ne peut plus être validé (statut ${resultat.statut}).`,
      );
    }
    return resultat.don;
  }

  // Valide le don de façon atomique. Renvoie valide: false si un autre appel l'a déjà traité
  // (webhook et vérification de statut simultanés, double clic admin...), sans aucun effet de bord.
  private async appliquerValidation(idDon: number) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true, cagnotte: true },
    });
    if (!don) {
      throw new NotFoundException('Don introuvable.');
    }

    const donValide = await this.prisma.$transaction(async (tx) => {
      // Passage conditionnel EN_ATTENTE -> VALIDE : un seul appel concurrent peut obtenir count === 1.
      const { count } = await tx.don.updateMany({
        where: { id_don: idDon, statut: 'EN_ATTENTE' },
        data: { statut: 'VALIDE' },
      });
      if (count === 0) {
        return null;
      }

      await tx.paiement.update({
        where: { id_paiement: don.id_paiement },
        data: { statut: 'VALIDE' },
      });

      await tx.cagnotte.update({
        where: { id_cagnotte: don.id_cagnotte },
        data: { montant_collecte: { increment: don.paiement.montant } },
      });

      await tx.transaction.create({
        data: {
          id_paiement: don.id_paiement,
          type: 'DON',
          montant: don.paiement.montant,
          devise: don.paiement.devise,
          statut: 'SUCCES',
        },
      });

      return tx.don.findUnique({ where: { id_don: idDon } });
    });

    if (!donValide) {
      const actuel = await this.prisma.don.findUnique({
        where: { id_don: idDon },
        select: { statut: true },
      });
      return { valide: false as const, statut: actuel?.statut ?? don.statut };
    }

    await this.notificationsService.envoyer(
      don.cagnotte.id_utilisateur,
      'Nouveau don reçu',
      `Vous avez reçu un don de ${Number(don.paiement.montant).toLocaleString('fr-FR')} ${don.paiement.devise} sur "${don.cagnotte.titre}".`,
      'DON',
      don.cagnotte.id_cagnotte,
    );

    return { valide: true as const, don: donValide };
  }

  // Passe le don et son paiement en ECHOUE, seulement s'ils sont encore EN_ATTENTE (même principe que
  // appliquerValidation) : un don déjà validé ne peut jamais redevenir « échoué ».
  // Renvoie le statut du don après l'appel.
  private async appliquerEchec(idDon: number, idPaiement: number) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.don.updateMany({
        where: { id_don: idDon, statut: 'EN_ATTENTE' },
        data: { statut: 'ECHOUE' },
      });
      if (count === 0) {
        const actuel = await tx.don.findUnique({
          where: { id_don: idDon },
          select: { statut: true },
        });
        return actuel?.statut ?? 'ECHOUE';
      }
      await tx.paiement.updateMany({
        where: { id_paiement: idPaiement, statut: 'EN_ATTENTE' },
        data: { statut: 'ECHOUE' },
      });
      return 'ECHOUE' as const;
    });
  }

  // Liste publique : aucun identifiant interne, et aucun nom pour les dons anonymes.
  // Même règle de visibilité que GET /cagnottes/:id (404 pour une cagnotte masquée).
  async listerParCagnotte(
    idCagnotte: number,
    dto: PaginationDto,
    utilisateur: UtilisateurVisiteur,
  ) {
    await this.cagnottesService.trouverVisible(idCagnotte, utilisateur);
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where = { id_cagnotte: idCagnotte, statut: 'VALIDE' as const };
    const [dons, total] = await this.prisma.$transaction([
      this.prisma.don.findMany({
        where,
        select: {
          id_don: true,
          message: true,
          est_anonyme: true,
          date_creation: true,
          paiement: { select: { montant: true, devise: true } },
          utilisateur: { select: { nom: true, prenom: true } },
        },
        orderBy: [{ date_creation: 'desc' }, { id_don: 'desc' }],
        skip,
        take,
      }),
      this.prisma.don.count({ where }),
    ]);

    const donnees = dons.map((don) => {
      const visible = !don.est_anonyme && don.utilisateur;
      return {
        id_don: don.id_don,
        montant: don.paiement.montant,
        devise: don.paiement.devise,
        message: don.message,
        date_creation: don.date_creation,
        est_anonyme: don.est_anonyme,
        donateur: {
          nom: visible ? don.utilisateur!.nom : null,
          prenom: visible ? don.utilisateur!.prenom : null,
        },
      };
    });
    return construirePage(donnees, total, page, limite);
  }

  async listerTous() {
    return this.prisma.don.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: {
        cagnotte: { select: { titre: true, devise: true } },
        utilisateur: { select: { nom: true, prenom: true, email: true } },
        paiement: {
          select: {
            montant: true,
            methode_paiement: true,
            numero_payeur: true,
          },
        },
      },
      orderBy: { date_creation: 'desc' },
    });
  }
}
