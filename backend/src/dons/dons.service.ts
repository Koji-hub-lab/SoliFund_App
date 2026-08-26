import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDonDto } from './dto/create-don.dto';

@Injectable()
export class DonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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

    return this.prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.create({
        data: {
          montant: dto.montant,
          devise: cagnotte.devise,
          methode_paiement: dto.methode_paiement as any,
          numero_payeur: dto.numero_payeur,
          id_utilisateur: idUtilisateur,
        },
      });

      const don = await tx.don.create({
        data: {
          id_cagnotte: dto.id_cagnotte,
          id_utilisateur: idUtilisateur,
          id_paiement: paiement.id_paiement,
          message: dto.message,
          est_anonyme: dto.est_anonyme ?? false,
        },
      });

      return don;
    });
  }

  async validerPaiement(idDon: number) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true, cagnotte: true },
    });
    if (!don) {
      throw new NotFoundException('Don introuvable.');
    }
    if (don.statut === 'VALIDE') {
      throw new BadRequestException('Ce don est déjà validé.');
    }

    const donValide = await this.prisma.$transaction(async (tx) => {
      await tx.paiement.update({
        where: { id_paiement: don.id_paiement },
        data: { statut: 'VALIDE' },
      });

      const donMisAJour = await tx.don.update({
        where: { id_don: idDon },
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

      return donMisAJour;
    });

    await this.notificationsService.envoyer(
      don.cagnotte.id_utilisateur,
      'Nouveau don reçu',
      `Tu as reçu un don de ${don.paiement.montant} ${don.paiement.devise} sur "${don.cagnotte.titre}".`,
      'DON',
      don.cagnotte.id_cagnotte,
    );

    return donValide;
  }

  async listerParCagnotte(idCagnotte: number) {
    return this.prisma.don.findMany({
      where: { id_cagnotte: idCagnotte, statut: 'VALIDE' },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
      orderBy: { date_creation: 'desc' },
    });
  }
}
