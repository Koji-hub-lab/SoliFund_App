import type {
  DetailTransaction3SPay,
  Operateur3SPay,
  Transaction3SPay,
} from './types-3spay';

export type StatutPaiementSoliFund = 'EN_ATTENTE' | 'VALIDE' | 'ECHOUE';

const VALIDES = ['confirmed', 'completed'];
// « reversed » (mouvement contre-passé) est rare mais traité comme un échec définitif.
const ECHOUES = ['failed', 'expired', 'cancelled', 'reversed'];

// Statut 3SPAY → statut du paiement SoliFund. terminal : le statut ne changera plus.
// Un statut inconnu reste EN_ATTENTE : on ne conclut jamais à un échec sans statut terminal.
export function convertirStatut3SPay(statut: string | null | undefined): {
  statut: StatutPaiementSoliFund;
  terminal: boolean;
} {
  const s = (statut ?? '').toLowerCase();
  if (VALIDES.includes(s)) return { statut: 'VALIDE', terminal: true };
  if (ECHOUES.includes(s)) return { statut: 'ECHOUE', terminal: true };
  // initiated, pending, processing, ou statut non documenté.
  return { statut: 'EN_ATTENTE', terminal: false };
}

// error_type pour lesquels un nouvel essai peut aboutir (table « Codes d'erreur » de 3SPAY).
const ERREURS_RECUPERABLES = [
  'INSUFFICIENT_BALANCE',
  'DAILY_LIMIT_REACHED',
  'ACCOUNT_BLOCKED',
  'INVALID_PIN',
  'OPERATOR_TIMEOUT',
  'NETWORK_ERROR',
];

export interface ErreurTransaction3SPay {
  error_type: string | null;
  error_code: string | null;
  error_recoverable: boolean;
}

// Erreur d'une transaction : champs error_type, error_code, error_recoverable de la réponse, ou
// objet « error » de la consultation (dont la forme n'est pas détaillée par la spécification).
// error_recoverable absent : déduit de error_type selon la table de 3SPAY.
export function lireErreur3SPay(
  transaction: Transaction3SPay | DetailTransaction3SPay,
): ErreurTransaction3SPay {
  const imbrique =
    'error' in transaction && transaction.error ? transaction.error : {};
  const texte = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const errorType =
    texte(transaction.error_type) ??
    texte(imbrique.error_type) ??
    texte(imbrique.type);
  const errorCode =
    texte(transaction.error_code) ??
    texte(imbrique.error_code) ??
    texte(imbrique.code);
  const recuperable =
    typeof transaction.error_recoverable === 'boolean'
      ? transaction.error_recoverable
      : typeof imbrique.error_recoverable === 'boolean'
        ? imbrique.error_recoverable
        : typeof imbrique.recoverable === 'boolean'
          ? imbrique.recoverable
          : ERREURS_RECUPERABLES.includes(errorType ?? '');
  return {
    error_type: errorType,
    error_code: errorCode,
    error_recoverable: recuperable,
  };
}

// Un opérateur est disponible s'il figure dans la liste de GET /operators sans être marqué
// inactif. Les codes suffixés par le pays (« mtn_cm », vus dans l'exemple de la spécification)
// sont reconnus.
export function operateurDisponible(
  operateurs: Operateur3SPay[],
  code: string,
): boolean {
  return operateurs.some(
    (o) =>
      o.disponible &&
      (o.code.toLowerCase() === code ||
        o.code.toLowerCase().startsWith(`${code}_`)),
  );
}
