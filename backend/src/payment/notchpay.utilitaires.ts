import { randomBytes } from 'crypto';
import { m } from '../i18n/messages';

// Utilitaires du paiement Mobile Money par Notch Pay : numéros, canaux, statuts, messages d'erreur.

export type MethodePaiement = 'MTN_MOBILE_MONEY' | 'ORANGE_MONEY';
export type StatutPaiementSoliFund = 'EN_ATTENTE' | 'VALIDE' | 'ECHOUE';

// Numéro camerounais au format attendu par Notch Pay : +2376XXXXXXXX. Accepte les saisies
// « 6XX XX XX XX », « 237 6XX... », « +237 6XX... », « 00237 6XX... », avec espaces, points ou
// tirets. Renvoie null si ce n'est pas un numéro mobile camerounais (9 chiffres commençant par 6).
export function normaliserNumero(numero: string): string | null {
  const chiffres = numero.replace(/[\s.\-()]/g, '').replace(/^(\+|00)/, '');
  const national = chiffres.replace(/^237(?=6\d{8}$)/, '');
  return /^6\d{8}$/.test(national) ? `+237${national}` : null;
}

// Canal Notch Pay de chaque méthode de paiement SoliFund.
const CANAUX: Record<MethodePaiement, string> = {
  MTN_MOBILE_MONEY: 'cm.mtn',
  ORANGE_MONEY: 'cm.orange',
};

export function canalNotchPay(methode: MethodePaiement): string {
  return CANAUX[methode];
}

// Statuts Notch Pay → statuts SoliFund. Tout statut absent de ces listes est traité comme
// « en attente » : un statut inconnu ne valide et n'échoue jamais un paiement.
const STATUTS_VALIDES = ['complete', 'completed', 'success', 'successful'];
const STATUTS_ECHOUES = [
  'failed',
  'canceled',
  'cancelled',
  'expired',
  'rejected',
  'abandoned',
  'reversed', // versement annulé après coup : la somme est revenue
];
// Connus comme « en cours » : pending, processing, sent, incomplete.

export function statutDepuisNotchPay(statut: string): StatutPaiementSoliFund {
  const normalise = statut.trim().toLowerCase();
  if (STATUTS_VALIDES.includes(normalise)) return 'VALIDE';
  if (STATUTS_ECHOUES.includes(normalise)) return 'ECHOUE';
  return 'EN_ATTENTE';
}

// Vrai quand le statut ne changera plus (validé ou échoué).
export function estStatutFinal(statut: string): boolean {
  return statutDepuisNotchPay(statut) !== 'EN_ATTENTE';
}

// Codes d'erreur Mobile Money de Notch Pay : message affiché au donateur (clé de traduction,
// voir src/i18n) et possibilité de réessayer tout de suite avec le même numéro.
const ERREURS_MOBILE_MONEY = {
  INVALID_PHONE: { peutReessayer: false },
  UNREGISTERED_PHONE: { peutReessayer: false },
  INSUFFICIENT_BALANCE: { peutReessayer: true },
  TRANSACTION_LIMIT_EXCEEDED: { peutReessayer: false },
  TIMEOUT: { peutReessayer: true },
  PROVIDER_ERROR: { peutReessayer: true },
  CANCELLED_BY_USER: { peutReessayer: true },
  DUPLICATE_TRANSACTION: { peutReessayer: false },
  // Raison renvoyée par AangaraaPay pour un paiement refusé par MTN Mobile Money (solde, plafond
  // du bénéficiaire ou paiement marchand non autorisé : MTN ne précise pas lequel).
  LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED: { peutReessayer: true },
} as const;

export type CodeErreurMobileMoney = keyof typeof ERREURS_MOBILE_MONEY;

export interface ErreurMobileMoney {
  // Code reconnu, ou null pour un code inconnu ou absent (message générique).
  code: CodeErreurMobileMoney | null;
  // Message à renvoyer au client : traduit à la sortie selon la langue de la requête.
  message: string;
  peutReessayer: boolean;
}

function estCodeConnu(code: string): code is CodeErreurMobileMoney {
  return Object.keys(ERREURS_MOBILE_MONEY).includes(code);
}

export function erreurMobileMoney(code?: string | null): ErreurMobileMoney {
  const normalise = code?.trim().toUpperCase() ?? '';
  if (estCodeConnu(normalise)) {
    return {
      code: normalise,
      message: m(`paiement.${normalise}`),
      peutReessayer: ERREURS_MOBILE_MONEY[normalise].peutReessayer,
    };
  }
  return { code: null, message: m('paiement.ECHEC'), peutReessayer: true };
}

// Messages d'erreur de Notch Pay reconnus, quand la réponse ne donne pas de code métier.
// Réel (docs/paiement/exemples/paiement-echoue-34.json) : « Invalid CM Mobile Money » en 422 au
// traitement, pour un numéro refusé par le canal choisi.
const CODES_PAR_MESSAGE: [RegExp, CodeErreurMobileMoney][] = [
  // En premier : ce code contient « LIMIT » et « BALANCE », qui ne doivent pas l'emporter.
  [
    /LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED/i,
    'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED',
  ],
  [
    /invalid\s+\w*\s*mobile\s*money|invalid\s+(phone|number|msisdn)/i,
    'INVALID_PHONE',
  ],
  [/not\s+registered|unregistered|non\s+enregistr/i, 'UNREGISTERED_PHONE'],
  [
    /insufficient\s+(funds|balance)|balance\s+too\s+low/i,
    'INSUFFICIENT_BALANCE',
  ],
  [/limit\s+exceeded|exceeds?\s+(the\s+)?limit/i, 'TRANSACTION_LIMIT_EXCEEDED'],
  [
    /cancell?ed\s+by\s+(the\s+)?(user|customer)|rejected\s+by\s+(the\s+)?(user|customer)/i,
    'CANCELLED_BY_USER',
  ],
  [/timed?\s*out|timeout/i, 'TIMEOUT'],
  // Raisons en français des opérateurs (AangaraaPay, details.reason : « Solde insuffisant »...).
  [/solde\s+insuffisant|fonds\s+insuffisants/i, 'INSUFFICIENT_BALANCE'],
  [
    /annul[ée]+\s+par\s+(le\s+)?(client|l'utilisateur|utilisateur)/i,
    'CANCELLED_BY_USER',
  ],
  [
    /num[ée]ro\s+(de\s+t[ée]l[ée]phone\s+)?(invalide|inexistant)/i,
    'INVALID_PHONE',
  ],
  [
    /plafond|limite\s+(de\s+transaction\s+)?d[ée]pass[ée]e/i,
    'TRANSACTION_LIMIT_EXCEEDED',
  ],
  [/d[ée]lai\s+(de\s+confirmation\s+)?d[ée]pass[ée]|expir[ée]/i, 'TIMEOUT'],
  [/erreur\s+(de\s+l'|chez\s+l')?op[ée]rateur/i, 'PROVIDER_ERROR'],
];

// Code Mobile Money déduit d'un message d'erreur de Notch Pay, ou undefined s'il n'est pas reconnu.
export function codeErreurDepuisMessage(
  message?: string | null,
): CodeErreurMobileMoney | undefined {
  if (!message) return undefined;
  return CODES_PAR_MESSAGE.find(([motif]) => motif.test(message))?.[1];
}

// Référence SoliFund d'un paiement ou d'un versement, unique et envoyée à Notch Pay :
// « SLF-DON-20261002-9F3A1C7B2E ». Elle rend les créations idempotentes (une référence déjà
// utilisée est refusée par Notch Pay).
export function genererReference(type: 'DON' | 'RETRAIT'): string {
  const jour = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SLF-${type}-${jour}-${randomBytes(5).toString('hex').toUpperCase()}`;
}
