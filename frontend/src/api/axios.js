import axios from 'axios';

export const API_URL = 'http://localhost:3000';

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
    }
    return Promise.reject(error);
  },
);

export default api;