import { ConfigService } from '@nestjs/config';

// Commission SoliFund prélevée sur les retraits.

export const TAUX_COMMISSION_PAR_DEFAUT = 3;

// Taux en vigueur, en % (COMMISSION_TAUX_POURCENT, au plus deux décimales).
export function tauxCommission(config: ConfigService): number {
  const valeur = Number(config.get<string>('COMMISSION_TAUX_POURCENT'));
  return Number.isFinite(valeur) && valeur >= 0 && valeur <= 100
    ? Math.round(valeur * 100) / 100
    : TAUX_COMMISSION_PAR_DEFAUT;
}

// Commission arrondie à l'entier le plus proche (XAF sans centimes) ; net = brut - commission.
// Calcul en entiers (taux en centièmes de %) pour éviter les erreurs d'arrondi des décimaux.
export function calculerCommission(montantBrut: number, tauxPourcent: number) {
  const tauxCentiemes = Math.round(tauxPourcent * 100);
  const montantCommission = Math.round((montantBrut * tauxCentiemes) / 10_000);
  return {
    montant_commission: montantCommission,
    montant_net: montantBrut - montantCommission,
  };
}
