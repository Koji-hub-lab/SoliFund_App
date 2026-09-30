import i18n, { localeActive } from '../i18n';

// Formats selon la langue active (Intl) : « 10 000 XAF » en français, « 10,000 XAF » en anglais.

export function formaterMontant(valeur, devise = 'XAF') {
  return `${Number(valeur).toLocaleString(localeActive())} ${devise}`;
}

export function formaterDate(date) {
  return new Date(date).toLocaleDateString(localeActive(), { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formaterDateHeure(date) {
  return new Date(date).toLocaleString(localeActive(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formaterMoisAnnee(date) {
  return new Date(date).toLocaleDateString(localeActive(), { month: 'long', year: 'numeric' });
}

// Date relative courte : « à l'instant », « il y a 5 min », « hier »… (« just now », « 5 min. ago », « yesterday »).
export function formaterDateRelative(date) {
  const format = new Intl.RelativeTimeFormat(localeActive(), { numeric: 'auto', style: 'short' });
  const secondes = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const ecart = Math.abs(secondes);
  if (ecart < 60) return i18n.t('commun:aLInstant');
  if (ecart < 3600) return format.format(Math.round(secondes / 60), 'minute');
  if (ecart < 86400) return format.format(Math.round(secondes / 3600), 'hour');
  if (ecart < 7 * 86400) return format.format(Math.round(secondes / 86400), 'day');
  if (ecart < 30 * 86400) return format.format(Math.round(secondes / (7 * 86400)), 'week');
  if (ecart < 365 * 86400) return format.format(Math.round(secondes / (30 * 86400)), 'month');
  return format.format(Math.round(secondes / (365 * 86400)), 'year');
}
