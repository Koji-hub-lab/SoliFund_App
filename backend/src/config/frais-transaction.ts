import type { MethodePaiement } from '../payment/notchpay.utilitaires';

// Frais de transaction Mobile Money, payés par le donateur en plus de son don : taux d'encaissement
// de l'opérateur du donateur + taux de versement de l'opérateur de retrait de l'organisateur.
// Taux en %, réglables par variables d'environnement (vérifiées au démarrage, env.validation.ts) et
// lus à chaque appel. Valeurs par défaut : tarifs d'AangaraaPay.
export const VARIABLES_FRAIS = {
  encaissement: {
    MTN_MOBILE_MONEY: 'FRAIS_MTN_ENCAISSEMENT_POURCENT',
    ORANGE_MONEY: 'FRAIS_ORANGE_ENCAISSEMENT_POURCENT',
  },
  versement: {
    MTN_MOBILE_MONEY: 'FRAIS_MTN_VERSEMENT_POURCENT',
    ORANGE_MONEY: 'FRAIS_ORANGE_VERSEMENT_POURCENT',
  },
} as const;

export const TAUX_FRAIS_PAR_DEFAUT = {
  encaissement: { MTN_MOBILE_MONEY: 1.7, ORANGE_MONEY: 1.5 },
  versement: { MTN_MOBILE_MONEY: 1.3, ORANGE_MONEY: 2.1 },
} as const;

type Sens = keyof typeof VARIABLES_FRAIS;
const METHODES: MethodePaiement[] = ['MTN_MOBILE_MONEY', 'ORANGE_MONEY'];

// Taux en vigueur, en centièmes de % (1,70 % → 170) : les calculs se font en entiers.
function tauxCentiemes(sens: Sens, methode: MethodePaiement): number {
  const brut = process.env[VARIABLES_FRAIS[sens][methode]];
  const valeur = Number(brut);
  const pourcent =
    brut?.trim() && Number.isFinite(valeur) && valeur >= 0 && valeur <= 100
      ? valeur
      : TAUX_FRAIS_PAR_DEFAUT[sens][methode];
  return Math.round(pourcent * 100);
}

// Taux en vigueur, en % (pour l'affichage).
export function tauxFrais() {
  const lire = (sens: Sens) =>
    Object.fromEntries(
      METHODES.map((m) => [m, tauxCentiemes(sens, m) / 100]),
    ) as Record<MethodePaiement, number>;
  return { encaissement: lire('encaissement'), versement: lire('versement') };
}

export interface FraisDon {
  montant_don: number;
  montant_frais: number;
  montant_total: number;
  // Taux appliqués, en %.
  taux_encaissement: number;
  taux_versement: number;
}

// Frais d'un don, arrondis au franc CFA SUPÉRIEUR. methodeRetrait : opérateur de retrait vérifié
// de l'organisateur ; null s'il n'est pas encore connu (le taux de versement le plus élevé
// s'applique alors).
export function calculerFraisDon(
  montantDon: number,
  methodeDonateur: MethodePaiement,
  methodeRetrait: MethodePaiement | null,
): FraisDon {
  const encaissement = tauxCentiemes('encaissement', methodeDonateur);
  const versement = methodeRetrait
    ? tauxCentiemes('versement', methodeRetrait)
    : Math.max(...METHODES.map((m) => tauxCentiemes('versement', m)));
  // montant × taux / 10 000, arrondi au supérieur, sans passer par des décimaux.
  const produit = montantDon * (encaissement + versement);
  const frais = Math.floor(produit / 10_000) + (produit % 10_000 > 0 ? 1 : 0);
  return {
    montant_don: montantDon,
    montant_frais: frais,
    montant_total: montantDon + frais,
    taux_encaissement: encaissement / 100,
    taux_versement: versement / 100,
  };
}
