import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  DELAI_ATTENTE_MS,
  DELAI_CONFLIT_MS,
  DELAI_INITIAL_MS,
  DELAI_MAX_MS,
  ESSAIS_CONFLIT,
  ESSAIS_TEMPORAIRES,
} from './configuration-3spay';
import { Erreur3SPay } from './erreur-3spay';
import type {
  DemandeDepot3SPay,
  DemandeVersement3SPay,
  DetailTransaction3SPay,
  Operateur3SPay,
  Solde3SPay,
  Transaction3SPay,
} from './types-3spay';

// Fonction d'attente entre deux essais : remplaçable dans les tests pour ne pas attendre.
export const ATTENTE_3SPAY = Symbol('ATTENTE_3SPAY');
export type Attente = (ms: number) => Promise<void>;
const attendreVraiment: Attente = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Codes HTTP après lesquels un nouvel essai peut aboutir (hors 409, traité à part).
const STATUTS_TEMPORAIRES = new Set([429, 502, 503]);

// Client de l'API 3SPAY (voir docs/paiement/3spay-openapi.json). Sur chaque appel : en-têtes
// apikey, X-Partner-Id et X-Request-Id ; X-Idempotency-Key sur les créations, avec la clé fournie
// par l'appelant (enregistrée avec le paiement, pour rejouer la même clé lors d'un nouvel essai :
// 3SPAY renvoie alors la réponse d'origine sans refaire le mouvement).
// Le request_id est toujours écrit dans les journaux ; la clé d'API jamais.
@Injectable()
export class Client3SPay {
  private readonly logger = new Logger('3SPAY');
  private readonly urlApi: string;
  private readonly cleApi: string;
  private readonly idPartenaire: string;
  private readonly attendre: Attente;

  constructor(
    config: ConfigService,
    @Optional() @Inject(ATTENTE_3SPAY) attendre?: Attente,
  ) {
    this.urlApi = config
      .getOrThrow<string>('TROISPAY_API_URL')
      .replace(/\/+$/, '');
    this.cleApi = config.getOrThrow<string>('TROISPAY_API_KEY');
    this.idPartenaire = config.getOrThrow<string>('TROISPAY_PARTNER_ID');
    this.attendre = attendre ?? attendreVraiment;
  }

  // GET /api/v1/operators. Le format des éléments n'est pas décrit par la spécification (l'exemple
  // montre des chaînes) : les chaînes et les objets sont acceptés. La liste étant celle des
  // opérateurs actifs, un opérateur absent doit être considéré comme indisponible.
  async listerOperateurs(): Promise<Operateur3SPay[]> {
    const reponse = await this.appeler<{ operators?: unknown[] }>(
      'GET',
      '/api/v1/operators',
    );
    return (reponse.operators ?? [])
      .map(normaliserOperateur)
      .filter((o): o is Operateur3SPay => o !== null);
  }

  creerDepot(
    demande: DemandeDepot3SPay,
    cleIdempotence: string,
  ): Promise<Transaction3SPay> {
    return this.appeler('POST', '/api/v1/deposits', {
      corps: { currency: 'XAF', ...demande },
      cleIdempotence,
    });
  }

  creerVersement(
    demande: DemandeVersement3SPay,
    cleIdempotence: string,
  ): Promise<Transaction3SPay> {
    return this.appeler('POST', '/api/v1/payouts', {
      corps: { currency: 'XAF', ...demande },
      cleIdempotence,
    });
  }

  consulterTransaction(idTransaction: string): Promise<DetailTransaction3SPay> {
    return this.appeler(
      'GET',
      `/api/v1/transactions/${encodeURIComponent(idTransaction)}`,
    );
  }

  consulterParReference(
    referencePartenaire: string,
  ): Promise<DetailTransaction3SPay> {
    return this.appeler(
      'GET',
      `/api/v1/transactions/by-partner-ref/${encodeURIComponent(referencePartenaire)}`,
    );
  }

  consulterSolde(): Promise<Solde3SPay> {
    return this.appeler('GET', '/api/v1/balance');
  }

  private async appeler<T>(
    methode: 'GET' | 'POST',
    chemin: string,
    options: { corps?: object; cleIdempotence?: string } = {},
  ): Promise<T> {
    if (methode === 'POST' && !options.cleIdempotence) {
      throw new Error('Clé d’idempotence obligatoire pour une création 3SPAY.');
    }
    let conflits = 0;
    let temporaires = 0;

    for (;;) {
      const requestId = randomUUID();
      const entetes: Record<string, string> = {
        apikey: this.cleApi,
        'X-Partner-Id': this.idPartenaire,
        'X-Request-Id': requestId,
        Accept: 'application/json',
      };
      if (options.corps) entetes['Content-Type'] = 'application/json';
      if (options.cleIdempotence) {
        entetes['X-Idempotency-Key'] = options.cleIdempotence;
      }
      const libelle = `${methode} ${chemin}`;

      let reponse: Response;
      try {
        reponse = await fetch(`${this.urlApi}${chemin}`, {
          method: methode,
          headers: entetes,
          body: options.corps ? JSON.stringify(options.corps) : undefined,
          signal: AbortSignal.timeout(DELAI_ATTENTE_MS),
        });
      } catch (e) {
        // Délai dépassé ou erreur réseau : résultat inconnu, nouvel essai (même clé d'idempotence).
        const cause =
          e instanceof Error && e.name === 'TimeoutError'
            ? `délai de ${DELAI_ATTENTE_MS / 1000} s dépassé`
            : `erreur réseau (${e instanceof Error ? e.message : String(e)})`;
        if (temporaires < ESSAIS_TEMPORAIRES) {
          const delai = DELAI_INITIAL_MS * 2 ** temporaires;
          temporaires += 1;
          this.logger.warn(
            `${libelle} : ${cause} (request_id=${requestId}), nouvel essai dans ${delai} ms`,
          );
          await this.attendre(delai);
          continue;
        }
        this.logger.error(`${libelle} : ${cause} (request_id=${requestId})`);
        throw new Erreur3SPay(
          `3SPAY injoignable : ${cause}.`,
          true,
          null,
          requestId,
        );
      }

      const corps = await lireCorps(reponse);
      const idRenvoye =
        lireTexte(corps, 'request_id') ??
        reponse.headers.get('x-request-id') ??
        requestId;

      if (reponse.ok) {
        this.logger.log(
          `${libelle} → ${reponse.status} (request_id=${idRenvoye})`,
        );
        return corps as T;
      }

      const message = messageErreur(corps, reponse.status);
      if (reponse.status === 409 && conflits < ESSAIS_CONFLIT) {
        conflits += 1;
        this.logger.warn(
          `${libelle} → 409, requête identique en cours (request_id=${idRenvoye}), nouvel essai dans ${DELAI_CONFLIT_MS} ms`,
        );
        await this.attendre(DELAI_CONFLIT_MS);
        continue;
      }

      const temporaire =
        reponse.status === 409 ||
        STATUTS_TEMPORAIRES.has(reponse.status) ||
        reponse.status >= 500;
      if (
        temporaire &&
        reponse.status !== 409 &&
        temporaires < ESSAIS_TEMPORAIRES
      ) {
        const delai = Math.min(
          Math.max(
            DELAI_INITIAL_MS * 2 ** temporaires,
            delaiRetryAfter(reponse),
          ),
          DELAI_MAX_MS,
        );
        temporaires += 1;
        this.logger.warn(
          `${libelle} → ${reponse.status} (request_id=${idRenvoye}), nouvel essai dans ${delai} ms`,
        );
        await this.attendre(delai);
        continue;
      }

      this.logger.error(
        `${libelle} → ${reponse.status} ${temporaire ? 'après nouveaux essais' : 'refus définitif'} : ${message} (request_id=${idRenvoye})`,
      );
      throw new Erreur3SPay(message, temporaire, reponse.status, idRenvoye);
    }
  }
}

async function lireCorps(reponse: Response): Promise<unknown> {
  const texte = await reponse.text();
  if (!texte) return null;
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return texte;
  }
}

function lireTexte(corps: unknown, cle: string): string | null {
  if (corps && typeof corps === 'object' && cle in corps) {
    const valeur = (corps as Record<string, unknown>)[cle];
    return typeof valeur === 'string' && valeur ? valeur : null;
  }
  return null;
}

// Message d'erreur 3SPAY : « message » (ErrorResponse) ou liste « detail » (422 de validation).
function messageErreur(corps: unknown, statut: number): string {
  const message = lireTexte(corps, 'message');
  if (message) return message;
  if (corps && typeof corps === 'object' && 'detail' in corps) {
    const detail = corps.detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) =>
          [d.loc?.join('.'), d.msg].filter(Boolean).join(' : '),
        )
        .join(' ; ');
    }
  }
  return `Erreur HTTP ${statut}`;
}

// Retry-After en secondes (429) ; 0 si absent ou illisible.
function delaiRetryAfter(reponse: Response): number {
  const valeur = Number(reponse.headers.get('retry-after'));
  return Number.isFinite(valeur) && valeur > 0 ? valeur * 1000 : 0;
}

// Élément de GET /operators : chaîne (« mtn ») ou objet ({ code, enabled, status... }).
function normaliserOperateur(element: unknown): Operateur3SPay | null {
  if (typeof element === 'string') {
    return { code: element, disponible: true };
  }
  if (!element || typeof element !== 'object') return null;
  const o = element as Record<string, unknown>;
  const code = [o.code, o.operator, o.id, o.name].find(
    (v): v is string => typeof v === 'string' && v !== '',
  );
  if (!code) return null;
  const inactif =
    [o.enabled, o.active, o.available, o.configured].some((v) => v === false) ||
    (typeof o.status === 'string' &&
      /disabled|inactive|unavailable|not_configured|désactivé/i.test(o.status));
  return { code, disponible: !inactif };
}
