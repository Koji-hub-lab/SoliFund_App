import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Site bilingue français / anglais. Les textes sont dans src/locales/<langue>/<zone>.json, une zone
// par partie du site (commun, accueil, cagnotte, tableau-de-bord, admin, auth, identite, erreurs,
// legal). Dans un composant : const { t } = useTranslation('zone') puis t('cle').

export const LANGUES = ['fr', 'en'];
const CLE_STOCKAGE = 'solifund_langue';

// Tous les fichiers de traduction sont chargés avec l'application (ils sont petits).
const fichiers = import.meta.glob('./locales/*/*.json', { eager: true });
const resources = {};
for (const [chemin, module] of Object.entries(fichiers)) {
  const [, langue, zone] = chemin.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  resources[langue] ??= {};
  resources[langue][zone] = module.default;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Français par défaut. À la première visite : langue du navigateur si c'est l'anglais.
    fallbackLng: 'fr',
    supportedLngs: LANGUES,
    load: 'languageOnly', // « en-US » → « en »
    defaultNS: 'commun',
    interpolation: { escapeValue: false }, // React échappe déjà les textes
    detection: {
      // Choix mémorisé d'abord, sinon langue du navigateur ; le résultat est gardé dans localStorage.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: CLE_STOCKAGE,
      caches: ['localStorage'],
    },
  });

// Attribut lang de <html> et titre de l'onglet : toujours ceux de la langue active.
function appliquerLangue() {
  document.documentElement.lang = langueActive();
  document.title = i18n.t('commun:titreSite');
}
i18n.on('languageChanged', appliquerLangue);
appliquerLangue();

export function langueActive() {
  return i18n.resolvedLanguage ?? 'fr';
}

// Locale des formats Intl (montants, dates) pour la langue active.
export function localeActive() {
  return langueActive() === 'en' ? 'en-GB' : 'fr-FR';
}

// Changement demandé par l'utilisateur (sélecteur FR | EN) : appliqué et mémorisé dans le navigateur.
// Pour un utilisateur connecté, AuthContext l'enregistre aussi dans son compte (langue_preferee).
export function changerLangue(langue) {
  return i18n.changeLanguage(langue);
}

export default i18n;
