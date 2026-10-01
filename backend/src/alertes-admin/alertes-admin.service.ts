import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BrevoService } from '../jetons/brevo.service';
import {
  NotificationsService,
  type ParametresNotification,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Langue } from '../i18n/langues';
import {
  traduire,
  type CleMessage,
  type ParametresMessage,
} from '../i18n/messages';

// Après un email d'alerte, les alertes suivantes sont regroupées en un seul email envoyé à la fin
// de ce délai.
export const DELAI_REGROUPEMENT_MS = 10 * 60 * 1000;

export type CodeAlerte =
  | 'IDENTITE_A_VERIFIER'
  | 'CAGNOTTE_EN_VERIFICATION'
  | 'SUSPENSION_AUTOMATIQUE'
  | 'VERSEMENT_INCERTAIN'
  | 'VERSEMENT_INTROUVABLE';

type Alerte = { code: CodeAlerte; parametres: ParametresNotification };

// Texte d'une alerte pour un email (« Titre — message »), dans la langue du destinataire.
export function texteAlerte(alerte: Alerte, langue: Langue): string {
  const parametres: ParametresMessage = {};
  for (const [nom, valeur] of Object.entries(alerte.parametres)) {
    // Les listes sont des codes de raisons de vérification : chacun a son libellé traduit.
    parametres[nom] = Array.isArray(valeur)
      ? valeur.map((code) => ({ cle: `raisons.${code}` as CleMessage }))
      : valeur;
  }
  return `${traduire(langue, `alertes.${alerte.code}.titre`)} — ${traduire(langue, `alertes.${alerte.code}.message`, parametres)}`;
}

// Alertes de modération destinées aux administrateurs : identité à vérifier, cagnotte en
// vérification, suspension automatique, versement à vérifier. Chaque alerte crée tout de suite une
// notification dans l'application pour chaque administrateur, et un email écrit dans la langue
// préférée de chacun : immédiat, puis regroupé (un email au plus toutes les 10 minutes).
// Les alertes en attente d'email sont en base (slf_alerte_email) : elles survivent à un redémarrage
// ou à une mise en veille de l'application, et sont envoyées à la fin de la fenêtre par la tâche
// « alertes » (TachesService, lancée par Cron ou par l'application avec TACHES_INTERNES=true).
@Injectable()
export class AlertesAdminService {
  private readonly logger = new Logger(AlertesAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly brevoService: BrevoService,
  ) {}

  // Ne lève jamais d'erreur : une alerte qui échoue ne doit pas faire échouer l'action d'origine.
  async alerter(
    code: CodeAlerte,
    parametres: ParametresNotification,
    idCagnotte?: number,
  ) {
    try {
      const admins = await this.administrateurs();
      for (const admin of admins) {
        await this.notificationsService.envoyer(
          admin.id_utilisateur,
          code,
          parametres,
          'SYSTEME',
          idCagnotte,
        );
      }
    } catch (e) {
      this.logger.warn(`Notification d'alerte non envoyée : ${this.texte(e)}`);
    }

    try {
      await this.prisma.alerteEmail.create({
        data: { code, parametres: parametres as Prisma.InputJsonObject },
      });
      // Aucun email depuis 10 minutes : envoi immédiat ; sinon l'alerte attend la fin de la fenêtre.
      if (await this.fenetreTerminee()) await this.envoyerEmails();
    } catch (e) {
      this.logger.error(
        `Alerte non enregistrée pour l'email : ${this.texte(e)}`,
      );
    }
  }

  // Tâche « alertes » : envoie les alertes en attente si la fenêtre de regroupement est terminée.
  // Renvoie le nombre d'alertes envoyées.
  async envoyerAlertesEnAttente(): Promise<number> {
    const enAttente = await this.prisma.alerteEmail.count({
      where: { date_envoi: null },
    });
    if (enAttente === 0 || !(await this.fenetreTerminee())) return 0;
    return this.envoyerEmails();
  }

  // Envoie en un seul email toutes les alertes en attente, sans attendre la fin de la fenêtre.
  // Les alertes sont réservées de façon atomique : deux processus (application et Cron) ne les
  // envoient jamais deux fois. En cas d'échec, elles sont remises en attente. Renvoie leur nombre.
  async envoyerEmails(): Promise<number> {
    const reservees = await this.prisma.$queryRaw<
      {
        id_alerte: number;
        code: CodeAlerte;
        parametres: ParametresNotification;
      }[]
    >`UPDATE slf_alerte_email SET date_envoi = now()
      WHERE date_envoi IS NULL
      RETURNING id_alerte, code, parametres`;
    if (reservees.length === 0) return 0;
    const alertes: Alerte[] = reservees
      .sort((a, b) => a.id_alerte - b.id_alerte)
      .map(({ code, parametres }) => ({ code, parametres }));
    try {
      const admins = await this.administrateurs();
      for (const admin of admins) {
        const langue = admin.langue_preferee;
        await this.brevoService.envoyerAlerteAdmin(
          admin,
          alertes.length > 1
            ? traduire(langue, 'emails.alertes.sujetPlusieurs', {
                nombre: alertes.length,
              })
            : traduire(langue, 'emails.alertes.sujetUn'),
          alertes.map((alerte) => texteAlerte(alerte, langue)),
        );
      }
      return alertes.length;
    } catch (e) {
      this.logger.error(`Email d'alerte non envoyé : ${this.texte(e)}`);
      await this.prisma.alerteEmail.updateMany({
        where: { id_alerte: { in: reservees.map((a) => a.id_alerte) } },
        data: { date_envoi: null },
      });
      return 0;
    }
  }

  // Supprime les alertes envoyées depuis plus de 30 jours (maintenance nocturne).
  async purgerAlertesEnvoyees(maintenant = new Date()): Promise<number> {
    const { count } = await this.prisma.alerteEmail.deleteMany({
      where: {
        date_envoi: {
          lt: new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });
    return count;
  }

  // Vrai si aucun email d'alerte n'est parti depuis DELAI_REGROUPEMENT_MS.
  private async fenetreTerminee(): Promise<boolean> {
    const dernier = await this.prisma.alerteEmail.aggregate({
      _max: { date_envoi: true },
    });
    const date = dernier._max.date_envoi;
    return !date || Date.now() - date.getTime() >= DELAI_REGROUPEMENT_MS;
  }

  private administrateurs() {
    return this.prisma.utilisateur.findMany({
      where: {
        statut: 'ACTIF',
        posseders: { some: { role: { nom: 'ROLE_ADMIN' } } },
      },
      select: {
        id_utilisateur: true,
        email: true,
        prenom: true,
        langue_preferee: true,
      },
    });
  }

  private texte(e: unknown) {
    return e instanceof Error ? e.message : String(e);
  }
}
