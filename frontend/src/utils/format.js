export function formaterMontant(valeur, devise = 'XAF') {
  return `${Number(valeur).toLocaleString('fr-FR')} ${devise}`;
}

export function formaterDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formaterDateHeure(date) {
  return new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
