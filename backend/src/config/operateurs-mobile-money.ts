// Préfixes des numéros mobiles camerounais par opérateur Mobile Money.
// SEUL ENDROIT À METTRE À JOUR quand les opérateurs ouvrent de nouvelles tranches : le backend
// s'en sert pour refuser un numéro qui ne correspond pas à l'opérateur choisi (dons, numéro de
// retrait de la vérification d'identité), et le frontend les lit par GET /paiements/operateurs.
// Un préfixe s'applique aux 9 chiffres du numéro national (sans +237) : « 67 » couvre 67XXXXXXX,
// « 650 » couvre 650XXXXXX. Un numéro dont le préfixe n'est dans aucune liste n'est pas contrôlé.
// Source : documentation AangaraaPay (docs/paiement/aangaraa-api.md) — MTN 650-654 et 670-683,
// Orange 655-659 et 690-699. Les tranches 684 à 689 n'y figurent pas : elles ne sont pas contrôlées.
export const OPERATEURS_MOBILE_MONEY = {
  MTN_MOBILE_MONEY: {
    nom: 'MTN',
    prefixes: [
      '650',
      '651',
      '652',
      '653',
      '654',
      '67',
      '680',
      '681',
      '682',
      '683',
    ],
  },
  ORANGE_MONEY: {
    nom: 'Orange',
    prefixes: ['655', '656', '657', '658', '659', '69'],
  },
} as const;

export type OperateurMobileMoney = keyof typeof OPERATEURS_MOBILE_MONEY;

// Opérateur d'un numéro camerounais (« 677123456 », « +237 677 12 34 56 »...), ou null si son
// préfixe n'est pas connu.
export function operateurDuNumero(numero: string): OperateurMobileMoney | null {
  const national = numero
    .replace(/[\s.\-()]/g, '')
    .replace(/^(\+|00)?237(?=\d{9}$)/, '');
  for (const [operateur, { prefixes }] of Object.entries(
    OPERATEURS_MOBILE_MONEY,
  )) {
    const liste: readonly string[] = prefixes;
    if (liste.some((prefixe) => national.startsWith(prefixe))) {
      return operateur as OperateurMobileMoney;
    }
  }
  return null;
}

// Vrai si le numéro appartient à un autre opérateur que celui choisi. Un préfixe inconnu n'est
// jamais considéré comme incohérent.
export function numeroIncoherent(numero: string, operateurChoisi: string) {
  const operateur = operateurDuNumero(numero);
  return operateur !== null && operateur !== operateurChoisi ? operateur : null;
}
