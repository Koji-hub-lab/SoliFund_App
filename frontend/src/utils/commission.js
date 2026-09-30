import { useEffect, useState } from 'react';
import api from '../api/axios';
import { localeActive } from '../i18n';

// Commission SoliFund sur les retraits. Le taux vient de l'API (GET /commission) : il n'est écrit
// en dur nulle part dans le site.

let tauxConnu = null; // gardé en mémoire : un seul appel par visite
let demande = null;

function chargerTaux() {
  if (!demande) {
    demande = api.get('/commission').then((res) => {
      tauxConnu = Number(res.data.taux_pourcent);
      return tauxConnu;
    });
    // Échec : on réessaiera au prochain affichage.
    demande.catch(() => {
      demande = null;
    });
  }
  return demande;
}

// Taux en % (ex. 3), ou null tant qu'il n'est pas connu.
export function useTauxCommission() {
  const [taux, setTaux] = useState(tauxConnu);
  useEffect(() => {
    let actif = true;
    chargerTaux()
      .then((valeur) => actif && setTaux(valeur))
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, []);
  return taux;
}

// « 3 % », « 2,5 % » en français ; « 3% », « 2.5% » en anglais.
export function formaterTaux(taux) {
  return (Number(taux) / 100).toLocaleString(localeActive(), { style: 'percent', maximumFractionDigits: 2 });
}

// Même calcul que le backend : commission arrondie à l'entier, net = brut - commission.
export function calculerCommission(montantBrut, tauxPourcent) {
  const commission = Math.round((montantBrut * Math.round(tauxPourcent * 100)) / 10000);
  return { commission, net: montantBrut - commission };
}
