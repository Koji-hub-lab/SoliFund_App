import { Injectable } from '@nestjs/common';
import { FUSEAU, jourADouala } from '../common/dates';
import {
  PaginationDto,
  construirePage,
  lirePagination,
} from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

// Revenus de SoliFund : commissions prélevées sur les retraits versés (registre slf_commission).
@Injectable()
export class RevenusService {
  constructor(private readonly prisma: PrismaService) {}

  // Total, mois en cours et détail par mois. Les mois sont ceux du calendrier de Douala.
  async resume() {
    const parMois = await this.prisma.$queryRaw<
      { mois: string; total: number; nombre: number }[]
    >`SELECT to_char(("date" AT TIME ZONE 'UTC') AT TIME ZONE ${FUSEAU}, 'YYYY-MM') AS mois,
             SUM(montant)::float8 AS total,
             COUNT(*)::int AS nombre
      FROM slf_commission
      GROUP BY 1
      ORDER BY 1 DESC`;
    const moisEnCours = jourADouala().slice(0, 7);
    return {
      total: parMois.reduce((somme, m) => somme + m.total, 0),
      mois_en_cours: moisEnCours,
      total_mois_en_cours:
        parMois.find((m) => m.mois === moisEnCours)?.total ?? 0,
      par_mois: parMois,
    };
  }

  async totalMoisEnCours(): Promise<number> {
    return (await this.resume()).total_mois_en_cours;
  }

  // Liste détaillée : une ligne par retrait versé, la plus récente d'abord.
  async lister(dto: PaginationDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const [lignes, total] = await this.prisma.$transaction([
      this.prisma.commission.findMany({
        select: {
          id_commission: true,
          montant: true,
          taux: true,
          date: true,
          cagnotte: { select: { id_cagnotte: true, titre: true } },
          retrait: {
            select: {
              id_retrait: true,
              montant_brut: true,
              montant_net: true,
              utilisateur: { select: { prenom: true, nom: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { id_commission: 'desc' }],
        skip,
        take,
      }),
      this.prisma.commission.count(),
    ]);
    return construirePage(lignes, total, page, limite);
  }
}
