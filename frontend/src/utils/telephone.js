import i18n from '../i18n';

// Numéro mobile camerounais : 9 chiffres commençant par 6, préfixe +237 et espaces tolérés.
// Renvoie la forme à 9 chiffres (ex. « 690000000 »), ou null si le format est invalide.
export function normaliserNumero(saisie) {
  const chiffres = String(saisie).replace(/[\s.-]/g, '').replace(/^(\+?237)/, '');
  return /^6\d{8}$/.test(chiffres) ? chiffres : null;
}

// Message d'erreur dans la langue active (fonction : la langue peut changer pendant la visite).
export function messageNumeroInvalide() {
  return i18n.t('erreurs:numeroInvalide');
}
