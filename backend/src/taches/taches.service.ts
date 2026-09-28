import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const FUSEAU = 'Africa/Douala';

// Date du jour à Douala, sous forme de minuit UTC (même format que les colonnes @db.Date).
function aujourdhuiADouala(): Date {
  const jour = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(new Date()); // AAAA-MM-JJ
  return new Date(`${jour}T00:00:00.000Z`);
}

@Injectable()
export class TachesService {
  private readonly logger = new Logger(TachesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('5 0 * * *', { name: 'maintenance-nocturne', timeZone: FUSEAU })
  async maintenanceNocturne() {
    try {
      const terminees = await this.terminerCagnottesEchues();
      const reactives = await this.leverSuspensionsEchues();
      this.logger.log(`Maintenance : ${terminees} cagnotte(s) terminée(s), ${reactives} compte(s) réactivé(s).`);
    } catch (e) {
      this.logger.error('Échec de la maintenance nocturne', e instanceof Error ? e.stack : String(e));
    }
  }

  // Passe en TERMINEE les cagnottes ACTIVE dont le dernier jour (date_fin) est passé,
  // puis prévient chaque organisateur avec le montant collecté.
  async terminerCagnottesEchues(): Promise<number> {
    const echues = await this.prisma.cagnotte.findMany({
      where: { statut: 'ACTIVE', date_fin: { lt: aujourdhuiADouala() } },
      select: { id_cagnotte: true, id_utilisateur: true, titre: true, montant_collecte: true, devise: true },
    });

    let nb = 0;
    for (const c of echues) {
      // Mise à jour conditionnelle : si la cagnotte a changé de statut entre-temps, on ne notifie pas.
      const { count } = await this.prisma.cagnotte.updateMany({
        where: { id_cagnotte: c.id_cagnotte, statut: 'ACTIVE' },
        data: { statut: 'TERMINEE' },
      });
      if (count === 0) continue;
      nb++;

      const montant = `${Number(c.montant_collecte).toLocaleString('fr-FR')} ${c.devise}`;
      try {
        await this.notificationsService.envoyer(
          c.id_utilisateur,
          'Cagnotte terminée',
          `Ta cagnotte « ${c.titre} » est terminée. Montant collecté : ${montant}.`,
          'SYSTEME',
          c.id_cagnotte,
        );
      } catch (e) {
        this.logger.warn(`Notification de fin non envoyée (cagnotte ${c.id_cagnotte}) : ${e instanceof Error ? e.message : e}`);
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
