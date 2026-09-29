import axios from 'axios';

// En développement, VITE_API_URL reste vide : les appels passent par le proxy Vite (« /api », voir
// vite.config.js), ce qui fonctionne aussi depuis un téléphone du réseau local.
// En production, VITE_API_URL contient l'URL publique du backend (voir .env.example).
const URL_BACKEND = import.meta.env.VITE_API_URL || '';
export const API_URL = URL_BACKEND || '/api';

// URL d'un fichier servi par le backend (ex. image « /uploads/cagnottes/x.png ») :
// relative en développement (proxy « /uploads »), absolue en production.
export function urlFichier(chemin) {
  return chemin ? `${URL_BACKEND}${chemin}` : null;
}

// Lien de partage d'une cagnotte (WhatsApp, Facebook, copie) : page du backend qui fournit l'aperçu
// (photo, titre, description) puis redirige vers la page de la cagnotte. En développement, il passe
// par le proxy Vite (« /api »).
export function urlPartageCagnotte(idCagnotte) {
  const base = URL_BACKEND || `${window.location.origin}/api`;
  return `${base}/partage/cagnottes/${idCagnotte}`;
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.messageAffichable = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    } else {
      const msg = error.response.data?.message;
      error.messageAffichable = Array.isArray(msg) ? msg.join(', ') : msg || 'Une erreur est survenue.';

      // Token expiré ou compte suspendu/banni : on vide la session et on renvoie vers la connexion.
      // Uniquement pour les requêtes authentifiées (un mauvais mot de passe au login renvoie aussi 401).
      if (error.response.status === 401 && error.config?.headers?.Authorization) {
        localStorage.removeItem('token');
        localStorage.removeItem('utilisateur');
        // La page de retour Google gère elle-même l'échec (message sur /login?erreur=google).
        if (!['/login', '/auth/google/retour'].includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;