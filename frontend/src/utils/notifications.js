import i18n from '../i18n';
import { formaterMontant } from './format';
import { libelleRaisonVerification } from './statuts';

// Le backend enregistre un code et des paramètres ; le texte est écrit ici, dans la langue active
// (locales/*/tableau-de-bord.json, « codesNotification »). Les anciennes notifications, enregistrées
// en texte, n'ont pas de code : leur titre et leur message sont affichés tels quels.

const MONTANTS = ['montant', 'brut', 'net', 'commission'];

// Variante du message selon les paramètres (retrait sans commission, rejet sans motif).
function cleMessage(code, parametres) {
  if (code === 'RETRAIT_TRAITE' && !(Number(parametres.commission) > 0)) return 'messageSansCommission';
  if (code === 'RETRAIT_REJETE' && !parametres.motif) return 'messageSansMotif';
  return 'message';
}

// { titre, message } d'une notification, prêts à afficher.
export function texteNotification(notification) {
  const { code } = notification;
  if (!code) return { titre: notification.titre, message: notification.message };

  const base = `tableau-de-bord:codesNotification.${code}`;
  // Code inconnu de cette version du site : titre générique.
  if (!i18n.exists(`${base}.titre`)) {
    return { titre: i18n.t('tableau-de-bord:codesNotification.inconnue.titre'), message: notification.message ?? '' };
  }

  const parametres = { ...(notification.parametres ?? {}) };
  for (const nom of MONTANTS) {
    if (parametres[nom] !== undefined) parametres[nom] = formaterMontant(parametres[nom], parametres.devise);
  }
  if (Array.isArray(parametres.raisons)) {
    parametres.raisons = parametres.raisons.map(libelleRaisonVerification).join(', ');
  }
  return {
    titre: i18n.t(`${base}.titre`, parametres),
    message: i18n.t(`${base}.${cleMessage(code, notification.parametres ?? {})}`, parametres),
  };
}
