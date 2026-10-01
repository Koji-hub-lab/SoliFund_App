import { useEffect, useState } from 'react';
import api from '../api/axios';

// Préfixes des opérateurs Mobile Money, lus depuis l'API (GET /paiements/operateurs). Ils sont
// définis à un seul endroit : backend/src/config/operateurs-mobile-money.ts. Le backend refuse de
// toute façon un numéro d'un autre opérateur : si la lecture échoue, le formulaire ne contrôle rien.

let operateursConnus = null; // gardés en mémoire : un seul appel par visite
let demande = null;

function chargerOperateurs() {
  if (!demande) {
    demande = api.get('/paiements/operateurs').then((res) => {
      operateursConnus = res.data;
      return operateursConnus;
    });
    // Échec : on réessaiera au prochain affichage.
    demande.catch(() => {
      demande = null;
    });
  }
  return demande;
}

// { MTN_MOBILE_MONEY: { nom, prefixes }, ORANGE_MONEY: { nom, prefixes } }, ou null tant qu'ils ne
// sont pas connus.
export function useOperateursMobileMoney() {
  const [operateurs, setOperateurs] = useState(operateursConnus);
  useEffect(() => {
    let actif = true;
    chargerOperateurs()
      .then((valeur) => actif && setOperateurs(valeur))
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, []);
  return operateurs;
}

// Opérateur d'un numéro, même en cours de saisie (« 69 », « 655 »...), ou null s'il n'est pas
// encore reconnaissable. Même règle que le backend (préfixes des 9 chiffres nationaux).
export function operateurDuNumero(saisie, operateurs) {
  if (!operateurs) return null;
  const national = String(saisie)
    .replace(/[\s.\-()]/g, '')
    .replace(/^(\+|00)?237(?=6)/, '');
  for (const [operateur, { prefixes }] of Object.entries(operateurs)) {
    if (prefixes.some((prefixe) => national.startsWith(prefixe))) return operateur;
  }
  return null;
}
