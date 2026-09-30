import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
  'IDENTITE_A_VERIFIER' | 'CAGNOTTE_EN_VERIFICATION' | 'SUSPENSION_AUTOMATIQUE';

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
// vérification, suspension automatique. Chaque alerte crée tout de suite une notification dans
// l'application pour chaque administrateur, et un email (immédiat, puis regroupé), écrit dans la
// langue préférée de chaque administrateur.
// Le regroupement est en mémoire : il vaut pour une instance du serveur.
@Injectable()
export class AlertesAdminService implements OnModuleDestroy {
  private readonly logger = new Logger(AlertesAdminService.name);
  private dernierEnvoi = 0;
  private enAttente: Alerte[] = [];
  private minuteur: NodeJS.Timeout | null = null;

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

    this.enAttente.push({ code, parametres });
    const attente = this.dernierEnvoi + DELAI_REGROUPEMENT_MS - Date.now();
    if (attente <= 0) {
      await this.envoyerEmails();
    } else if (!this.minuteur) {
      this.minuteur = setTimeout(() => void this.envoyerEmails(), attente);
      // Ne retient pas l'arrêt du serveur.
      this.minuteur.unref();
    }
  }

  // Envoie en un seul email toutes les alertes en attente.
  async envoyerEmails() {
    if (this.minuteur) {
      clearTimeout(this.minuteur);
      this.minuteur = null;
    }
    const alertes = this.enAttente;
    this.enAttente = [];
    if (alertes.length === 0) return;
    this.dernierEnvoi = Date.now();
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
    } catch (e) {
      this.logger.error(`Email d'alerte non envoyé : ${this.texte(e)}`);
    }
  }

  onModuleDestroy() {
    if (this.minuteur) clearTimeout(this.minuteur);
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
