import {
  ErreurAuthentificationPaiement,
  ErreurConflitPaiement,
  ErreurIntrouvablePaiement,
  ErreurLimitePaiement,
  ErreurPaiement,
  ErreurReponsePaiement,
  ErreurServeurPaiement,
  ErreurValidationPaiement,
} from './paiement.erreurs';

// Lecture des réponses de Notch Pay. C'est le SEUL fichier qui connaît la forme des réponses :
// le reste du code n'utilise que les objets ci-dessous. La documentation n'est pas cohérente sur
// certains noms (« transaction » dans la spécification, « payment » dans des exemples) : chaque
// valeur est donc cherchée sous plusieurs noms, listés dans les constantes ci-dessous.
// À AJUSTER ICI après le script de découverte (docs/paiement/exemples/), et nulle part ailleurs.

// Clés sous lesquelles l'objet principal peut se trouver dans la réponse.
const CLES_PAIEMENT = ['transaction', 'payment', 'data'];
const CLES_VERSEMENT = ['transfer', 'transaction', 'data'];
const CLES_SOLDE = ['balance', 'data'];

// Champs d'un paiement ou d'un versement, par ordre de préférence.
// Réponses réelles (docs/paiement/exemples/paiement-echoue-*.json, GET /payments/{reference}) :
// « transaction » contient reference, merchant_reference (= trxref, notre référence), amount,
// currency, status, payment_method (identifiant « pm.… », PAS le canal) et provider_reference.
// Un paiement « failed » ne contient AUCUNE raison d'échec : les champs d'erreur ci-dessous
// restent donc vides pour lui ; ils sont gardés au cas où Notch Pay en ajouterait.
const CHAMPS = {
  reference: ['reference'],
  referenceMarchand: ['merchant_reference', 'trxref'],
  statut: ['status'],
  montant: ['amount'],
  devise: ['currency'],
  canal: ['channel'],
  codeErreur: ['error_code', 'failure_code', 'reason_code'],
  messageErreur: [
    'failure_reason',
    'error_message',
    'reason',
    'status_reason',
    'provider_message',
  ],
};
// L'erreur peut aussi être un objet imbriqué ({ error: { code, message } }).
const CLES_ERREUR_IMBRIQUEE = ['error', 'failure'];

export interface PaiementNotchPay {
  // Référence du paiement chez Notch Pay : c'est elle qui identifie le paiement dans l'URL
  // (PUT / GET / DELETE /payments/{reference}).
  reference: string;
  // Notre propre référence, si Notch Pay la renvoie.
  referenceMarchand?: string;
  // Statut tel que renvoyé par Notch Pay (voir statutDepuisNotchPay pour la correspondance).
  statut: string;
  montant?: number;
  devise?: string;
  canal?: string;
  // Raison de l'échec, quand le paiement a échoué.
  codeErreur?: string;
  messageErreur?: string;
  // Page de paiement hébergée par Notch Pay (non utilisée : le paiement est traité par l'API).
  urlAutorisation?: string;
  // Réponse complète, telle que reçue.
  brut: unknown;
}

export type VersementNotchPay = Omit<PaiementNotchPay, 'urlAutorisation'>;

export interface SoldeNotchPay {
  disponible: number;
  total?: number;
  enAttente?: number;
  devise: string;
  // « test » / « sandbox » ou « live ».
  environnement?: string;
  brut: unknown;
}

type Objet = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Objet {
  return (
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
  );
}

// Première valeur non vide parmi plusieurs noms de champ.
function premier(objet: Objet, noms: string[]): unknown {
  for (const nom of noms) {
    const valeur = objet[nom];
    if (valeur !== undefined && valeur !== null && valeur !== '') return valeur;
  }
  return undefined;
}

function texte(valeur: unknown): string | undefined {
  if (typeof valeur === 'string') return valeur;
  if (typeof valeur === 'number') return String(valeur);
  return undefined;
}

function nombre(valeur: unknown): number | undefined {
  const n = typeof valeur === 'string' ? Number(valeur) : valeur;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

// Objet principal de la réponse (le paiement, le versement, le solde).
function objetPrincipal(brut: unknown, cles: string[], nom: string): Objet {
  if (estObjet(brut)) {
    for (const cle of cles) {
      if (estObjet(brut[cle])) return brut[cle];
    }
  }
  throw new ErreurReponsePaiement(
    `Réponse Notch Pay illisible : ${nom} absent (clés attendues : ${cles.join(', ')}).`,
    { brut },
  );
}

function lireOperation(objet: Objet, brut: unknown, nom: string) {
  const reference = texte(premier(objet, CHAMPS.reference));
  const statut = texte(premier(objet, CHAMPS.statut));
  if (!reference || !statut) {
    throw new ErreurReponsePaiement(
      `Réponse Notch Pay illisible : ${nom} sans référence ou sans statut.`,
      { brut },
    );
  }
  const imbriquee = CLES_ERREUR_IMBRIQUEE.map((cle) => objet[cle]).find(
    estObjet,
  );
  return {
    reference,
    referenceMarchand: texte(premier(objet, CHAMPS.referenceMarchand)),
    statut,
    montant: nombre(premier(objet, CHAMPS.montant)),
    devise: texte(premier(objet, CHAMPS.devise)),
    canal: texte(premier(objet, CHAMPS.canal)),
    codeErreur:
      texte(premier(objet, CHAMPS.codeErreur)) ??
      (imbriquee ? texte(premier(imbriquee, ['code'])) : undefined),
    messageErreur:
      (imbriquee ? texte(premier(imbriquee, ['message'])) : undefined) ??
      texte(premier(objet, CHAMPS.messageErreur)),
    brut,
  };
}

export function lirePaiement(brut: unknown): PaiementNotchPay {
  const objet = objetPrincipal(brut, CLES_PAIEMENT, 'paiement');
  return {
    ...lireOperation(objet, brut, 'paiement'),
    urlAutorisation: estObjet(brut) ? texte(brut.authorization_url) : undefined,
  };
}

export function lireVersement(brut: unknown): VersementNotchPay {
  return lireOperation(
    objetPrincipal(brut, CLES_VERSEMENT, 'versement'),
    brut,
    'versement',
  );
}

export function lireSolde(brut: unknown): SoldeNotchPay {
  const objet = objetPrincipal(brut, CLES_SOLDE, 'solde');
  const disponible = nombre(premier(objet, ['available', 'balance']));
  const devise = texte(premier(objet, ['currency']));
  if (disponible === undefined || !devise) {
    throw new ErreurReponsePaiement(
      'Réponse Notch Pay illisible : solde sans montant disponible ou sans devise.',
      { brut },
    );
  }
  return {
    disponible,
    total: nombre(objet.total),
    enAttente: nombre(objet.pending),
    devise,
    environnement: texte(objet.environment),
    brut,
  };
}

export interface EvenementNotchPay {
  // Identifiant unique de l'événement (absent si Notch Pay n'en envoie pas).
  id?: string;
  // « payment.complete », « payment.failed », « transfer.complete »...
  type: string;
  // Référence Notch Pay de l'opération concernée, et la nôtre si elle est présente.
  reference?: string;
  referenceMarchand?: string;
}

// Événement reçu par webhook : { id, type (ou event), data: { reference, ... } }. Seuls le type et
// les références sont lus : le reste du contenu n'est jamais utilisé (le paiement est reconsulté).
export function lireEvenement(brut: unknown): EvenementNotchPay {
  const corps = estObjet(brut) ? brut : {};
  const donnees = estObjet(corps.data) ? corps.data : {};
  return {
    id: texte(premier(corps, ['id', 'event_id'])),
    type: texte(premier(corps, ['type', 'event'])) ?? 'inconnu',
    reference: texte(premier(donnees, CHAMPS.reference)),
    referenceMarchand: texte(premier(donnees, CHAMPS.referenceMarchand)),
  };
}

// Réponse d'erreur ({ code, status, message, errors }) → exception typée selon le statut HTTP.
export function lireErreur(statutHttp: number, brut: unknown): ErreurPaiement {
  const corps = estObjet(brut) ? brut : {};
  const imbriquee = CLES_ERREUR_IMBRIQUEE.map((cle) => corps[cle]).find(
    estObjet,
  );
  const message =
    texte(corps.message) ??
    (imbriquee ? texte(imbriquee.message) : undefined) ??
    `Erreur Notch Pay (HTTP ${statutHttp}).`;
  // Code métier s'il existe, sinon le code numérique de la réponse.
  const code =
    texte(premier(corps, CHAMPS.codeErreur)) ??
    (imbriquee ? texte(imbriquee.code) : undefined) ??
    texte(corps.code) ??
    String(statutHttp);
  const erreursChamps = estObjet(corps.errors)
    ? Object.fromEntries(
        Object.entries(corps.errors).map(([champ, valeurs]) => [
          champ,
          (Array.isArray(valeurs) ? valeurs : [valeurs]).map((v) =>
            typeof v === 'string' ? v : JSON.stringify(v),
          ),
        ]),
      )
    : undefined;
  const details = { statutHttp, code, erreursChamps, brut };

  if (statutHttp === 401 || statutHttp === 403) {
    return new ErreurAuthentificationPaiement(message, details);
  }
  if (statutHttp === 404)
    return new ErreurIntrouvablePaiement(message, details);
  if (statutHttp === 409) return new ErreurConflitPaiement(message, details);
  if (statutHttp === 429) return new ErreurLimitePaiement(message, details);
  if (statutHttp >= 500) return new ErreurServeurPaiement(message, details);
  return new ErreurValidationPaiement(message, details);
}
