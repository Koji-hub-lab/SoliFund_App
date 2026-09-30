import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DonsService } from './dons.service';

// Un don est réconcilié s'il est EN_ATTENTE depuis plus de 2 minutes (avant, le donateur est en
// train de confirmer et la page vérifie elle-même le statut).
export const DELAI_RECONCILIATION_MS = 2 * 60 * 1000;
// Sans statut final après 30 minutes, le paiement est annulé chez Notch Pay et le don échoue.
export const DELAI_ABANDON_MS = 30 * 60 * 1000;
// Dons traités par passage (les plus anciens d'abord).
const LOT = 50;

// Réconciliation des dons restés EN_ATTENTE : page fermée avant la confirmation, Notch Pay
// injoignable à la création, etc. Le statut est relu chez Notch Pay et appliqué ; un don n'est
// jamais marqué échoué sans statut final d'échec, sauf après l'annulation des 30 minutes.
@Injectable()
export class ReconciliationDonsService {
  private readonly logger = new Logger(ReconciliationDonsService.name);
  private enCours = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly donsService: DonsService,
  ) {}

  @Cron('*/5 * * * *', { name: 'reconciliation-dons' })
  async tache() {
    // Un passage à la fois : le précédent peut durer si Notch Pay répond lentement.
    if (this.enCours) return;
    this.enCours = true;
    try {
      const resultat = await this.reconcilier();
      if (resultat.consultes > 0) {
        this.logger.log(
          `Réconciliation : ${resultat.consultes} don(s) consulté(s), ${resultat.valides} validé(s), ${resultat.echoues} échoué(s), ${resultat.abandonnes} abandonné(s) après 30 minutes.`,
        );
      }
    } catch (e) {
      this.logger.error(
        'Échec de la réconciliation des dons',
        e instanceof Error ? e.stack : String(e),
      );
    } finally {
      this.enCours = false;
    }
  }

  async reconcilier(maintenant = new Date()) {
    const dons = await this.prisma.don.findMany({
      where: {
        statut: 'EN_ATTENTE',
        date_creation: {
          lt: new Date(maintenant.getTime() - DELAI_RECONCILIATION_MS),
        },
      },
      select: { id_don: true, date_creation: true },
      orderBy: { date_creation: 'asc' },
      take: LOT,
    });

    const resultat = { consultes: 0, valides: 0, echoues: 0, abandonnes: 0 };
    for (const don of dons) {
      resultat.consultes += 1;
      try {
        let statut = await this.donsService.synchroniserDon(don.id_don);
        if (
          statut === 'EN_ATTENTE' &&
          maintenant.getTime() - don.date_creation.getTime() > DELAI_ABANDON_MS
        ) {
          statut = (await this.donsService.abandonnerDon(don.id_don)) ?? statut;
          if (statut === 'ECHOUE') {
            resultat.abandonnes += 1;
            continue;
          }
        }
        if (statut === 'VALIDE') resultat.valides += 1;
        if (statut === 'ECHOUE') resultat.echoues += 1;
      } catch (e) {
        // Un don en erreur ne bloque pas les suivants.
        this.logger.error(
          `Réconciliation du don ${don.id_don} impossible`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }
    return resultat;
  }
}
