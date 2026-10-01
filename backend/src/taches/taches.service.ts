import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FUSEAU, estEchue } from '../common/dates';
import { ReconciliationDonsService } from '../dons/reconciliation-dons.service';
import { RetraitsService } from '../retraits/retraits.service';

@Injectable()
export class TachesService {
  private readonly logger = new Logger(TachesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly reconciliationDons: ReconciliationDonsService,
    private readonly retraitsService: RetraitsService,
  ) {}

  private reconciliationEnCours = false;

  // Toutes les 5 minutes : relit chez Notch Pay le statut des dons EN_ATTENTE depuis plus de
  // 2 minutes et des retraits APPROUVE (versement lancé) depuis plus de 5 minutes.
  @Cron('*/5 * * * *', { name: 'reconciliation-paiements' })
  async reconciliationPaiements() {
    // Un passage à la fois : le précédent peut durer si Notch Pay répond lentement.
    if (this.reconciliationEnCours) return;
    this.reconciliationEnCours = true;
    try {
      const dons = await this.reconciliationDons.reconcilier();
      const retraits = await this.retraitsService.reconcilierVersements();
      if (dons.consultes > 0 || retraits.consultes > 0) {
        this.logger.log(
          `Réconciliation : ${dons.consultes} don(s) consulté(s) (${dons.valides} validé(s), ${dons.echoues} échoué(s), ${dons.abandonnes} abandonné(s)) ; ${retraits.consultes} retrait(s) consulté(s) (${retraits.traites} versé(s), ${retraits.echoues} échoué(s)).`,
        );
      }
    } catch (e) {
      this.logger.error(
        'Échec de la réconciliation des paiements',
        e instanceof Error ? e.stack : String(e),
      );
    } finally {
      this.reconciliationEnCours = false;
    }
  }

  @Cron('5 0 * * *', { name: 'maintenance-nocturne', timeZone: FUSEAU })
  async maintenanceNocturne() {
    try {
      const terminees = await this.terminerCagnottesEchues();
      const reactives = await this.leverSuspensionsEchues();
      this.logger.log(
        `Maintenance : ${terminees} cagnotte(s) terminée(s), ${reactives} compte(s) réactivé(s).`,
      );
    } catch (e) {
      this.logger.error(
        'Échec de la maintenance nocturne',
        e instanceof Error ? e.stack : String(e),
      );
    }
  }

  // Passe en TERMINEE les cagnottes ACTIVE dont le dernier jour (date_fin) est passé,
  // puis prévient chaque organisateur avec le montant collecté.
  async terminerCagnottesEchues(): Promise<number> {
    // date_fin <= maintenant : présélection large en base ; estEchue (même règle que les dons) tranche.
    const maintenant = new Date();
    const candidates = await this.prisma.cagnotte.findMany({
      where: { statut: 'ACTIVE', date_fin: { lte: maintenant } },
      select: {
        id_cagnotte: true,
        id_utilisateur: true,
        titre: true,
        montant_collecte: true,
        devise: true,
        date_fin: true,
      },
    });
    const echues = candidates.filter((c) => estEchue(c.date_fin, maintenant));

    let nb = 0;
    for (const c of echues) {
      // Mise à jour conditionnelle : si la cagnotte a changé de statut entre-temps, on ne notifie pas.
      const { count } = await this.prisma.cagnotte.updateMany({
        where: { id_cagnotte: c.id_cagnotte, statut: 'ACTIVE' },
        data: { statut: 'TERMINEE' },
      });
      if (count === 0) continue;
      nb++;

      try {
        await this.notificationsService.envoyer(
          c.id_utilisateur,
          'CAGNOTTE_TERMINEE',
          {
            titre: c.titre,
            montant: Number(c.montant_collecte),
            devise: c.devise,
          },
          'SYSTEME',
          c.id_cagnotte,
        );
      } catch (e) {
        this.logger.warn(
          `Notification de fin non envoyée (cagnotte ${c.id_cagnotte}) : ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    return nb;
  }

  // Repasse en ACTIF les comptes dont la suspension est arrivée à échéance.
  async leverSuspensionsEchues(): Promise<number> {
    const { count } = await this.prisma.utilisateur.updateMany({
      where: { statut: 'SUSPENDU', date_fin_suspension: { lte: new Date() } },
      data: { statut: 'ACTIF', date_fin_suspension: null },
    });
    return count;
  }
}
