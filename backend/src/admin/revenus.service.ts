import { Injectable } from '@nestjs/common';
import { FUSEAU, jourADouala } from '../common/dates';
import {
  PaginationDto,
  construirePage,
  lirePagination,
} from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

// Revenus de SoliFund : commissions prélevées sur les retraits versés (registre slf_commission),
// avec, à côté, les frais de transaction payés par les donateurs.
@Injectable()
export class RevenusService {
  constructor(private readonly prisma: PrismaService) {}

  // Total, mois en cours et détail par mois. Les mois sont ceux du calendrier de Douala.
  // total / nombre : commissions sur les retraits versés (revenus de SoliFund). frais / nombre_dons :
  // frais de transaction payés par les donateurs, au mois de la validation du don (ils couvrent les
  // coûts de Mobile Money et ne sont pas comptés dans les revenus).
  async resume() {
    const commissions = await this.prisma.$queryRaw<
      { mois: string; total: number; nombre: number }[]
    >`SELECT to_char(("date" AT TIME ZONE 'UTC') AT TIME ZONE ${FUSEAU}, 'YYYY-MM') AS mois,
             SUM(montant)::float8 AS total,
             COUNT(*)::int AS nombre
      FROM slf_commission
      GROUP BY 1`;
    // Un don validé a une seule transaction DON, créée à sa validation.
    const frais = await this.prisma.$queryRaw<
      { mois: string; frais: number; nombre_dons: number }[]
    >`SELECT to_char((t.date_creation AT TIME ZONE 'UTC') AT TIME ZONE ${FUSEAU}, 'YYYY-MM') AS mois,
             SUM(d.montant_frais)::float8 AS frais,
             COUNT(*)::int AS nombre_dons
      FROM slf_transaction t
      JOIN slf_don d ON d.id_paiement = t.id_paiement
      WHERE t.type = 'DON' AND d.statut = 'VALIDE'
      GROUP BY 1`;

    const mois = new Map<
      string,
      {
        mois: string;
        total: number;
        nombre: number;
        frais: number;
        nombre_dons: number;
      }
    >();
    const ligne = (m: string) => {
      if (!mois.has(m)) {
        mois.set(m, { mois: m, total: 0, nombre: 0, frais: 0, nombre_dons: 0 });
      }
      return mois.get(m)!;
    };
    for (const c of commissions) Object.assign(ligne(c.mois), c);
    for (const f of frais) Object.assign(ligne(f.mois), f);
    const parMois = [...mois.values()].sort((a, b) =>
      b.mois.localeCompare(a.mois),
    );

    const moisEnCours = jourADouala().slice(0, 7);
    const enCours = mois.get(moisEnCours);
    return {
      total: parMois.reduce((somme, m) => somme + m.total, 0),
      mois_en_cours: moisEnCours,
      total_mois_en_cours: enCours?.total ?? 0,
      total_frais: parMois.reduce((somme, m) => somme + m.frais, 0),
      frais_mois_en_cours: enCours?.frais ?? 0,
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
