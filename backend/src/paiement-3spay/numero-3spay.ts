// Numéro Mobile Money camerounais au format attendu par 3SPAY : 2376XXXXXXXX (12 chiffres, sans +).
// Accepte les formats courants : « 6 99 00 00 00 », « 699-000-000 », « +237 699 00 00 00 »,
// « 00237699000000 », « 237699000000 »... Renvoie null si le numéro n'est pas un mobile valide.
export function normaliserNumero3SPay(saisie: string): string | null {
  let chiffres = saisie.trim().replace(/[\s.\-()/]/g, '');
  if (chiffres.startsWith('+')) chiffres = chiffres.slice(1);
  else if (chiffres.startsWith('00')) chiffres = chiffres.slice(2);
  if (!/^\d+$/.test(chiffres)) return null;
  if (chiffres.length === 9) chiffres = `237${chiffres}`;
  return /^2376\d{8}$/.test(chiffres) ? chiffres : null;
}
