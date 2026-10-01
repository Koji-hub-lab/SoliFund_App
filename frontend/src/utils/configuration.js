import { useEffect, useState } from 'react';
import api from '../api/axios';

// Réglages publics lus depuis l'API (GET /configuration), définis côté backend par variables
// d'environnement : { don_montant_minimum }. Le backend applique de toute façon ses règles : si la
// lecture échoue, le formulaire ne contrôle pas le minimum lui-même.

let configurationConnue = null; // gardée en mémoire : un seul appel par visite
let demande = null;

function chargerConfiguration() {
  if (!demande) {
    demande = api.get('/configuration').then((res) => {
      configurationConnue = res.data;
      return configurationConnue;
    });
    // Échec : on réessaiera au prochain affichage.
    demande.catch(() => {
      demande = null;
    });
  }
  return demande;
}

// Configuration publique, ou null tant qu'elle n'est pas connue.
export function useConfigurationPublique() {
  const [configuration, setConfiguration] = useState(configurationConnue);
  useEffect(() => {
    let actif = true;
    chargerConfiguration()
      .then((valeur) => actif && setConfiguration(valeur))
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, []);
  return configuration;
}

// Montants proposés en un clic, tous au moins égaux au minimum d'un don.
const MONTANTS_RAPIDES = [1000, 2000, 5000, 10000];

export function montantsRapides(minimum) {
  if (!minimum || minimum <= MONTANTS_RAPIDES[0]) return MONTANTS_RAPIDES;
  return [1, 2, 5, 10].map((facteur) => minimum * facteur);
}
