import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FUSEAU, estEchue } from '../common/dates';
import { ReconciliationDonsService } from '../dons/reconciliation-dons.service';
import { RetraitsService } from '../retraits/retraits.service';
import { VerificationIdentiteService } from '../verification-identite/verification-identite.service';
import { AlertesAdminService } from '../alertes-admin/alertes-admin.service';

// Tâches planifiées. En production, elles sont lancées par Cron avec le script
// scripts/taches.ts (« node dist/scripts/taches.js <tâche> ») : l'application peut être mise en
// veille par l'hébergeur (Passenger) et ne doit pas en dépendre. Avec TACHES_INTERNES=true
// (développement), l'application les lance elle-même (@Cron, actif seulement dans ce cas).
//   reconciliation  : dons EN_ATTENTE et retraits APPROUVE relus chez le fournisseur (5 minutes)
//   alertes         : emails d'alerte regroupés en attente (5 minutes)
//   maintenance     : cagnottes échues terminées, suspensions levées, vieilles alertes supprimées
//   purge-identites : fichiers des vérifications d'identité refusées depuis plus de 30 jours
export const TACHES = [
  'reconciliation',
  'alertes',
  'maintenance',
  'purge-identites',
] as const;
export type NomTache = (typeof TACHES)[number];

export function estTache(nom: unknown): nom is NomTache {
  return TACHES.includes(nom as NomTache);
}

@Injectable()
export class TachesService {
  private readonly logger = new Logger(TachesService.name);
  // Une exécution à la fois par tâche dans ce processus (une réconciliation peut durer si le
  // fournisseur répond lentement). Entre processus, Cron utilise flock (voir la documentation).
  private readonly enCours = new Set<NomTache>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly reconciliationDons: ReconciliationDonsService,
    private readonly retraitsService: RetraitsService,
    private readonly verificationIdentite: VerificationIdentiteService,
    private readonly alertesAdmin: AlertesAdminService,
  ) {}

  // Exécute une tâche et renvoie son résumé. Lève l'erreur en cas d'échec (le script la transforme
  // en code de sortie non nul, visible dans les emails de Cron).
  async executer(nom: NomTache): Promise<string> {
    return (await this.executerAvecBilan(nom)).resume;
  }

  // activite : faux quand la tâche n'a rien eu à faire (les tâches fréquentes ne l'écrivent pas).
  private async executerAvecBilan(
    nom: NomTache,
  ): Promise<{ resume: string; activite: boolean }> {
    if (this.enCours.has(nom)) {
      return {
        resume: `Tâche ${nom} déjà en cours : ignorée.`,
        activite: false,
      };
    }
    this.enCours.add(nom);
    try {
      switch (nom) {
        case 'reconciliation': {
          const dons = await this.reconciliationDons.reconcilier();
          const retraits = await this.retraitsService.reconcilierVersements();
          return {
            resume: `Réconciliation : ${dons.consultes} don(s) consulté(s) (${dons.valides} validé(s), ${dons.echoues} échoué(s), ${dons.abandonnes} abandonné(s)) ; ${retraits.consultes} retrait(s) consulté(s) (${retraits.traites} versé(s), ${retraits.echoues} échoué(s)).`,
            activite: dons.consultes + retraits.consultes > 0,
          };
        }
        case 'alertes': {
          const envoyees = await this.alertesAdmin.envoyerAlertesEnAttente();
          return {
            resume: `Alertes : ${envoyees} alerte(s) envoyée(s) par email.`,
            activite: envoyees > 0,
          };
        }
        case 'maintenance': {
          const terminees = await this.terminerCagnottesEchues();
          const reactives = await this.leverSuspensionsEchues();
          const alertes = await this.alertesAdmin.purgerAlertesEnvoyees();
          return {
            resume: `Maintenance : ${terminees} cagnotte(s) terminée(s), ${reactives} compte(s) réactivé(s), ${alertes} ancienne(s) alerte(s) supprimée(s).`,
            activite: true,
          };
        }
        case 'purge-identites': {
          const nb = await this.verificationIdentite.purgerFichiersRefuses();
          return {
            resume: `Purge : fichiers de ${nb} vérification(s) d'identité refusée(s) supprimés.`,
            activite: true,
          };
        }
      }
    } finally {
      this.enCours.delete(nom);
    }
  }

  // Tâches internes (TACHES_INTERNES=true) : mêmes tâches, erreurs seulement écrites dans les logs.
  @Cron('*/5 * * * *', { name: 'reconciliation' })
  reconciliationInterne() {
    return this.lancer('reconciliation');
  }

  @Cron('*/5 * * * *', { name: 'alertes' })
  alertesInterne() {
    return this.lancer('alertes');
  }

  @Cron('5 0 * * *', { name: 'maintenance', timeZone: FUSEAU })
  maintenanceInterne() {
    return this.lancer('maintenance');
  }

  @Cron('30 0 * * *', { name: 'purge-identites', timeZone: FUSEAU })
  purgeIdentitesInterne() {
    return this.lancer('purge-identites');
  }

  private async lancer(nom: NomTache) {
    try {
      const { resume, activite } = await this.executerAvecBilan(nom);
      if (activite) this.logger.log(resume);
    } catch (e) {
      this.logger.error(
        `Échec de la tâche ${nom}`,
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
