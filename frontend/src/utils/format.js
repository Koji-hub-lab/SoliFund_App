export function formaterMontant(valeur, devise = 'XAF') {
  return `${Number(valeur).toLocaleString('fr-FR')} ${devise}`;
}

export function formaterDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formaterDateHeure(date) {
  return new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formaterMoisAnnee(date) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// Date relative courte en français : « à l'instant », « il y a 5 min », « il y a 2 h », « hier »…
const formatRelatif = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' });

export function formaterDateRelative(date) {
  const secondes = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const ecart = Math.abs(secondes);
  if (ecart < 60) return "à l'instant";
  if (ecart < 3600) return formatRelatif.format(Math.round(secondes / 60), 'minute');
  if (ecart < 86400) return formatRelatif.format(Math.round(secondes / 3600), 'hour');
  if (ecart < 7 * 86400) return formatRelatif.format(Math.round(secondes / 86400), 'day');
  if (ecart < 30 * 86400) return formatRelatif.format(Math.round(secondes / (7 * 86400)), 'week');
  if (ecart < 365 * 86400) return formatRelatif.format(Math.round(secondes / (30 * 86400)), 'month');
  return formatRelatif.format(Math.round(secondes / (365 * 86400)), 'year');
}
