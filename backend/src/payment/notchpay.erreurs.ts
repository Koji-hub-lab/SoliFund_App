// Erreurs de l'API Notch Pay, converties en exceptions typées. Chacune porte le code et le message
// renvoyés par Notch Pay ; aucune ne contient de clé d'API.

export interface DetailsErreurNotchPay {
  // Statut HTTP de la réponse (absent pour une erreur réseau).
  statutHttp?: number;
  // Code renvoyé par Notch Pay : code métier (« INSUFFICIENT_BALANCE ») s'il existe, sinon le
  // code numérique de la réponse (« 422 »).
  code?: string;
  // Erreurs par champ d'une réponse de validation ({ amount: ['...'] }).
  erreursChamps?: Record<string, string[]>;
  // Corps brut de la réponse, pour le diagnostic.
  brut?: unknown;
}

export class ErreurNotchPay extends Error {
  readonly statutHttp?: number;
  readonly code?: string;
  readonly erreursChamps?: Record<string, string[]>;
  readonly brut?: unknown;

  constructor(message: string, details: DetailsErreurNotchPay = {}) {
    super(message);
    this.name = new.target.name;
    this.statutHttp = details.statutHttp;
    this.code = details.code;
    this.erreursChamps = details.erreursChamps;
    this.brut = details.brut;
  }
}

// 401 / 403 : clé publique absente ou invalide, clé privée (X-Grant) absente ou invalide.
export class ErreurAuthentificationNotchPay extends ErreurNotchPay {}

// 400 / 422 : requête refusée (montant, canal, numéro, paiement déjà traité...).
export class ErreurValidationNotchPay extends ErreurNotchPay {}

// 404 : paiement ou versement inconnu.
export class ErreurIntrouvableNotchPay extends ErreurNotchPay {}

// 409 : référence déjà utilisée.
export class ErreurConflitNotchPay extends ErreurNotchPay {}

// 429 : trop de requêtes.
export class ErreurLimiteNotchPay extends ErreurNotchPay {}

// 5xx, après les nouveaux essais.
export class ErreurServeurNotchPay extends ErreurNotchPay {}

// Aucune réponse (délai dépassé, connexion impossible), après les nouveaux essais.
export class ErreurReseauNotchPay extends ErreurNotchPay {}

// Réponse réussie mais illisible : l'objet attendu (paiement, versement, solde) est absent.
export class ErreurReponseNotchPay extends ErreurNotchPay {}
