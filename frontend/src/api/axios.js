import axios from 'axios';

// URL du backend : VITE_API_URL dans frontend/.env (voir .env.example), localhost en développement.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      error.messageAffichable = 'Impossible de joindre le serveur. Vérifie ta connexion.';
    } else {
      const msg = error.response.data?.message;
      error.messageAffichable = Array.isArray(msg) ? msg.join(', ') : msg || 'Une erreur est survenue.';

      // Token expiré ou compte suspendu/banni : on vide la session et on renvoie vers la connexion.
      // Uniquement pour les requêtes authentifiées (un mauvais mot de passe au login renvoie aussi 401).
      if (error.response.status === 401 && error.config?.headers?.Authorization) {
        localStorage.removeItem('token');
        localStorage.removeItem('utilisateur');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;