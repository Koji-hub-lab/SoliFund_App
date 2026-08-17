import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';

@Injectable()
export class RetraitsService {
  constructor(private readonly prisma: PrismaService) {}

  async demander(idUtilisateur: number, dto: CreateRetraitDto) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: dto.id_cagnotte },
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException("Tu n'es pas le propriétaire de cette cagnotte.");
    }

    const dejaRetire = await this.prisma.retrait.aggregate({
      where: { id_cagnotte: dto.id_cagnotte, statut: { in: ['APPROUVE', 'TRAITE'] } },
      _sum: { montant: true },
    });
    const totalDejaRetire = Number(dejaRetire._sum.montant ?? 0);
    const disponible = Number(cagnotte.montant_collecte) - totalDejaRetire;

    if (dto.montant > disponible) {
      throw new BadRequestException(`Montant disponible insuffisant (${disponible} ${cagnotte.devise}).`);
    }

    return this.prisma.retrait.create({
      data: {
        id_utilisateur: idUtilisateur,
        id_cagnotte: dto.id_cagnotte,
        montant: dto.montant,
        methode_retrait: dto.methode_retrait as any,
        numero_beneficiaire: dto.numero_beneficiaire,
      },
    });
  }

  // Réservé à un admin dans une vraie version (à protéger avec un guard de rôle plus tard).
  async traiter(idRetrait: number) {
    const retrait = await this.prisma.retrait.findUnique({ where: { id_retrait: idRetrait } });
    if (!retrait) {
      throw new NotFoundException('Retrait introuvable.');
    }
    if (retrait.statut !== 'EN_ATTENTE') {
      throw new BadRequestException('Ce retrait a déjà été traité.');
    }

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          id_retrait: idRetrait,
          type: 'RETRAIT',
          montant: retrait.montant,
          devise: 'XAF',
          statut: 'SUCCES',
        },
      });

      const retraitTraite = await tx.retrait.update({
        where: { id_retrait: idRetrait },
        data: { statut: 'TRAITE', date_traitement: new Date() },
      });

      return { ...retraitTraite, id_transaction: transaction.id_transaction };
    });
  }

  async listerParCagnotte(idCagnotte: number) {
    return this.prisma.retrait.findMany({
      where: { id_cagnotte: idCagnotte },
      orderBy: { date_creation: 'desc' },
    });
  }
}