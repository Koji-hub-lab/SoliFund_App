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

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), urlSite(mode)],
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
