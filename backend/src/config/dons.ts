// Montant minimum d'un don (XAF), réglable par DON_MONTANT_MINIMUM (100 par défaut). La variable
// est vérifiée au démarrage (env.validation.ts) ; elle est lue à chaque appel, après le chargement
// du .env (les décorateurs des DTO, eux, sont évalués avant).
export const DON_MONTANT_MINIMUM_DEFAUT = 100;

export function montantMinimumDon(): number {
  const valeur = Number(process.env.DON_MONTANT_MINIMUM);
  return process.env.DON_MONTANT_MINIMUM?.trim() &&
    Number.isInteger(valeur) &&
    valeur > 0
    ? valeur
    : DON_MONTANT_MINIMUM_DEFAUT;
}
