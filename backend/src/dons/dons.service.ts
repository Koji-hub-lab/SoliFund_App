import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentService } from '../payment/payment.service';
import { CreateDonDto } from './dto/create-don.dto';

@Injectable()
export class DonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
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

    const don = await this.prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.create({
        data: {
          montant: dto.montant,
          devise: cagnotte.devise,
          methode_paiement: dto.methode_paiement as any,
          numero_payeur: dto.numero_payeur,
          id_utilisateur: idUtilisateur,
        },
      });

      return tx.don.create({
        data: {
          id_cagnotte: dto.id_cagnotte,
          id_utilisateur: idUtilisateur,
          id_paiement: paiement.id_paiement,
          message: dto.message,
          est_anonyme: dto.est_anonyme ?? false,
        },
        include: { paiement: true },
      });
    });

    const referenceInterne = `don-${don.id_don}-${Date.now()}`;
    const resultat = await this.paymentService.initierPaiement(
      dto.numero_payeur,
      dto.montant,
      `Don pour ${cagnotte.titre}`,
      referenceInterne,
      dto.methode_paiement,
    );

    await this.prisma.paiement.update({
      where: { id_paiement: don.id_paiement },
      data: { transaction_id: resultat.payToken, reference_externe: referenceInterne },
    });

    return { ...don, statut_paiement: resultat.status };
  }

  async verifierStatutDon(idDon: number, idUtilisateur: number, estAdmin: boolean) {
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
    if (!don.paiement.transaction_id) {
      return { statut: 'EN_ATTENTE' };
    }

    const resultat = await this.paymentService.verifierStatut(don.paiement.transaction_id);

    if (resultat.status === 'SUCCESSFUL') {
      await this.appliquerValidation(idDon);
      return { statut: 'VALIDE' };
    }
    if (resultat.status === 'FAILED') {
      await this.prisma.paiement.update({ where: { id_paiement: don.id_paiement }, data: { statut: 'ECHOUE' } });
      await this.prisma.don.update({ where: { id_don: idDon }, data: { statut: 'ECHOUE' } });
      return { statut: 'ECHOUE' };
    }

    return { statut: 'EN_ATTENTE' };
  }

  async gererWebhookPaiement(transactionIdAangaraa: string, status: string) {
    const paiement = await this.prisma.paiement.findUnique({ where: { transaction_id: transactionIdAangaraa } });
    if (!paiement) return;

    const don = await this.prisma.don.findUnique({ where: { id_paiement: paiement.id_paiement } });
    if (!don || don.statut === 'VALIDE') return;

    if (status === 'SUCCESSFUL') {
      await this.appliquerValidation(don.id_don);
    } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
      await this.prisma.paiement.update({ where: { id_paiement: paiement.id_paiement }, data: { statut: 'ECHOUE' } });
      await this.prisma.don.update({ where: { id_don: don.id_don }, data: { statut: 'ECHOUE' } });
    }
  }

  // Endpoint admin : même comportement visible qu'avant (erreur si le don est déjà validé).
  async validerPaiement(idDon: number) {
    const resultat = await this.appliquerValidation(idDon);
    if (!resultat.valide) {
      if (resultat.statut === 'VALIDE') {
        throw new BadRequestException('Ce don est déjà validé.');
      }
      throw new BadRequestException(`Ce don ne peut plus être validé (statut ${resultat.statut}).`);
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
      const actuel = await this.prisma.don.findUnique({ where: { id_don: idDon }, select: { statut: true } });
      return { valide: false as const, statut: actuel?.statut ?? don.statut };
    }

    await this.notificationsService.envoyer(
      don.cagnotte.id_utilisateur,
      'Nouveau don reçu',
      `Tu as reçu un don de ${don.paiement.montant} ${don.paiement.devise} sur "${don.cagnotte.titre}".`,
      'DON',
      don.cagnotte.id_cagnotte,
    );

    return { valide: true as const, don: donValide };
  }

  async listerParCagnotte(idCagnotte: number) {
    return this.prisma.don.findMany({
      where: { id_cagnotte: idCagnotte, statut: 'VALIDE' },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
      orderBy: { date_creation: 'desc' },
    });
  }

  async listerTous() {
    return this.prisma.don.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: {
        cagnotte: { select: { titre: true, devise: true } },
        utilisateur: { select: { nom: true, prenom: true, email: true } },
        paiement: { select: { montant: true, methode_paiement: true, numero_payeur: true } },
      },
      orderBy: { date_creation: 'desc' },
    });
  }
}