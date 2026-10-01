import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En développement, le navigateur ne parle qu'au serveur Vite, qui relaie vers le backend (port 3000).
// Cela permet d'ouvrir le site depuis un téléphone du réseau local (http://<ip-du-pc>:5173).
const BACKEND = 'http://localhost:3000'

// Remplace %URL_SITE% dans index.html (balises Open Graph de l'accueil, qui exigent des URL absolues)
// par VITE_SITE_URL ; sans cette variable, les URL restent relatives au site.
function urlSite(mode) {
  const url = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL || '').replace(/\/+$/, '')
  return { name: 'url-site', transformIndexHtml: (html) => html.replaceAll('%URL_SITE%', url) }
}

// En production, le site est servi par un hébergement statique (o2switch) : sans VITE_API_URL, il
// appellerait « /api » sur ce même domaine, où aucune API ne répond. Avertissement au build.
function verifierUrlApi(mode) {
  return {
    name: 'verifier-url-api',
    apply: 'build',
    buildStart() {
      if (mode === 'production' && !loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL) {
        this.warn(
          'VITE_API_URL est vide : le site construit appellera /api sur son propre domaine. ' +
            'Pour la mise en ligne, renseignez-la dans frontend/.env.production (ex. https://api.solifund.exemple.cm).',
        )
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), urlSite(mode), verifierUrlApi(mode)],
  server: {
    host: true, // écoute aussi sur l'adresse du réseau local
    proxy: {
      // /api/cagnottes -> http://localhost:3000/cagnottes
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (chemin) => chemin.replace(/^\/api/, ''),
      },
      // Images envoyées par les utilisateurs : /uploads/... -> http://localhost:3000/uploads/...
      '/uploads': {
        target: BACKEND,
        changeOrigin: true,
      },
    },
  },
}))
