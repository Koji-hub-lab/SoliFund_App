// Erreurs des fournisseurs de paiement (Notch Pay, AangaraaPay), converties en exceptions typées,
// communes à tous les fournisseurs. Chacune porte le code et le message renvoyés par le
// fournisseur ; aucune ne contient de clé d'API.

export interface DetailsErreurPaiement {
  // Statut HTTP de la réponse (absent pour une erreur réseau).
  statutHttp?: number;
  // Code renvoyé par le fournisseur : code métier (« INSUFFICIENT_BALANCE ») s'il existe, sinon le
  // code numérique de la réponse (« 422 »).
  code?: string;
  // Erreurs par champ d'une réponse de validation ({ amount: ['...'] }).
  erreursChamps?: Record<string, string[]>;
  // Corps brut de la réponse, pour le diagnostic.
  brut?: unknown;
}

export class ErreurPaiement extends Error {
  readonly statutHttp?: number;
  readonly code?: string;
  readonly erreursChamps?: Record<string, string[]>;
  readonly brut?: unknown;
  // Renseignés par un fournisseur pendant un paiement direct en plusieurs étapes : la référence
  // de l'opération déjà créée chez lui, et si la demande a pu partir vers le téléphone du client.
  referenceFournisseur?: string;
  demandePeutEtrePartie?: boolean;

  constructor(message: string, details: DetailsErreurPaiement = {}) {
    super(message);
    this.name = new.target.name;
    this.statutHttp = details.statutHttp;
    this.code = details.code;
    this.erreursChamps = details.erreursChamps;
    this.brut = details.brut;
  }
}

// 401 / 403 : clé absente ou invalide, service inactif.
export class ErreurAuthentificationPaiement extends ErreurPaiement {}

// 400 / 422 : requête refusée (montant, canal, numéro, paiement déjà traité...).
export class ErreurValidationPaiement extends ErreurPaiement {}

// 404 (ou statut NOT_FOUND) : paiement ou versement inconnu du fournisseur.
export class ErreurIntrouvablePaiement extends ErreurPaiement {}

// 409 : référence déjà utilisée.
export class ErreurConflitPaiement extends ErreurPaiement {}

// 429 : trop de requêtes.
export class ErreurLimitePaiement extends ErreurPaiement {}

// 5xx, après les nouveaux essais.
export class ErreurServeurPaiement extends ErreurPaiement {}

// Aucune réponse (délai dépassé, connexion impossible), après les nouveaux essais.
export class ErreurReseauPaiement extends ErreurPaiement {}

// Réponse réussie mais illisible : l'objet attendu (paiement, versement, solde) est absent.
export class ErreurReponsePaiement extends ErreurPaiement {}

// Fournisseur non configuré (clé absente) ou opération qu'il ne propose pas.
export class ErreurConfigurationPaiement extends ErreurPaiement {}

// Erreur après laquelle on ne sait pas si l'opération existe chez le fournisseur : injoignable,
// 5xx, trop de requêtes, réponse illisible ou fournisseur non configuré. L'opération reste alors
// « en attente ».
export function estErreurTemporaire(erreur: ErreurPaiement): boolean {
  return (
    erreur instanceof ErreurReseauPaiement ||
    erreur instanceof ErreurServeurPaiement ||
    erreur instanceof ErreurLimitePaiement ||
    erreur instanceof ErreurReponsePaiement ||
    erreur instanceof ErreurConfigurationPaiement
  );
}
