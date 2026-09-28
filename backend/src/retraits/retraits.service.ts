import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';
import { RejectRetraitDto } from './dto/reject-retrait.dto';

@Injectable()
export class RetraitsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.$transaction(async (tx) => {
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
  }

  async rejeter(idRetrait: number, dto: RejectRetraitDto) {
    return this.prisma.$transaction(async (tx) => {
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
  }

  async listerParCagnotte(idCagnotte: number) {
    return this.prisma.retrait.findMany({
      where: { id_cagnotte: idCagnotte },
      orderBy: { date_creation: 'desc' },
    });
  }

  async listerToutes() {
    return this.prisma.retrait.findMany({
      include: {
        cagnotte: { select: { titre: true, devise: true } },
        utilisateur: { select: { nom: true, prenom: true, email: true } },
      },
      orderBy: [{ statut: 'asc' }, { date_creation: 'desc' }],
    });
  }
}