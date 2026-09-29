import { ConfigService } from '@nestjs/config';
import type { MethodePaiement } from '@prisma/client';

// Réglages du client 3SPAY (voir docs/paiement/3spay-openapi.json).

// Codes opérateurs Mobile Money reconnus par 3SPAY (champ « operator »). 3SPAY n'en refuse aucun :
// un code inconnu laisse le dépôt en attente pour toujours, d'où cette liste fermée.
export const CODES_OPERATEURS_3SPAY = [
  'mtn',
  'orange',
  'intouch',
  'mycoolpay',
] as const;
export type CodeOperateur3SPay = (typeof CODES_OPERATEURS_3SPAY)[number];

// Correspondance des moyens de paiement SoliFund vers les opérateurs 3SPAY. Orange Money passe
// par InTouch : l'opérateur « orange » direct est désactivé chez 3SPAY. Modifiable sans toucher
// au code avec TROISPAY_OPERATEUR_MTN et TROISPAY_OPERATEUR_ORANGE.
const OPERATEURS_PAR_DEFAUT: Record<MethodePaiement, CodeOperateur3SPay> = {
  MTN_MOBILE_MONEY: 'mtn',
  ORANGE_MONEY: 'intouch',
};
const VARIABLES_OPERATEURS: Record<MethodePaiement, string> = {
  MTN_MOBILE_MONEY: 'TROISPAY_OPERATEUR_MTN',
  ORANGE_MONEY: 'TROISPAY_OPERATEUR_ORANGE',
};

export function operateurPourMethode(
  methode: MethodePaiement,
  config?: ConfigService,
): CodeOperateur3SPay {
  const choisi = config?.get<string>(VARIABLES_OPERATEURS[methode]);
  return choisi &&
    (CODES_OPERATEURS_3SPAY as readonly string[]).includes(choisi)
    ? (choisi as CodeOperateur3SPay)
    : OPERATEURS_PAR_DEFAUT[methode];
}

// Délai d'attente de chaque appel HTTP.
export const DELAI_ATTENTE_MS = 30_000;
// 409 (requête identique déjà en cours) : nouvel essai après quelques secondes, 3 fois au plus.
export const ESSAIS_CONFLIT = 3;
export const DELAI_CONFLIT_MS = 3_000;
// 429, 502, 503, autres 5xx, délai dépassé ou erreur réseau : nouveaux essais à délai croissant
// (1 s, 2 s, 4 s), ou le délai indiqué par Retry-After s'il est plus long.
export const ESSAIS_TEMPORAIRES = 3;
export const DELAI_INITIAL_MS = 1_000;
export const DELAI_MAX_MS = 30_000;
