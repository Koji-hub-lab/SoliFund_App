import { fr } from './fr';
import { en } from './en';
import { LOCALES, type Langue } from './langues';

// Messages renvoyés au client (erreurs, validations, confirmations), emails et page de partage.
// Le code ne contient pas de texte : il désigne un message par sa clé, avec ses paramètres
// (`m('retraits.disponibleInsuffisant', { disponible, devise })`). Le texte est produit à la sortie,
// dans la langue de la requête (Accept-Language) : voir FiltreErreurs et TraductionReponses.
export type CleMessage = keyof typeof fr;

const DICTIONNAIRES: Record<Langue, Record<CleMessage, string>> = { fr, en };

// Valeur d'un paramètre : texte, nombre, ou référence à un autre message ({ cle }) ; une liste de
// références est traduite puis jointe par des virgules.
type Reference = { cle: CleMessage };
export type ParametresMessage = Record<
  string,
  string | number | Reference | Reference[]
>;

const PREFIXE = 'i18n§';

// Désigne un message à traduire. Le résultat est un texte codé (clé et paramètres) accepté partout
// où un message est attendu : exceptions HTTP, décorateurs class-validator, réponses { message }.
export function m(cle: CleMessage, parametres?: ParametresMessage): string {
  return parametres
    ? `${PREFIXE}${cle}§${JSON.stringify(parametres)}`
    : `${PREFIXE}${cle}`;
}

function estCle(cle: string): cle is CleMessage {
  return Object.keys(fr).includes(cle);
}

function valeurTexte(valeur: unknown, langue: Langue): string {
  if (Array.isArray(valeur)) {
    return valeur.map((v) => valeurTexte(v, langue)).join(', ');
  }
  if (valeur && typeof valeur === 'object' && 'cle' in valeur) {
    const cle = String((valeur as Reference).cle);
    return estCle(cle) ? traduire(langue, cle) : cle;
  }
  return typeof valeur === 'string' || typeof valeur === 'number'
    ? String(valeur)
    : '';
}

// Texte d'un message dans une langue. Dans le modèle, {nom} est remplacé par le paramètre ;
// {nom|date} le formate comme une date et {nom|nombre} comme un nombre, selon la langue.
export function traduire(
  langue: Langue,
  cle: CleMessage,
  parametres: ParametresMessage = {},
): string {
  const modele = DICTIONNAIRES[langue][cle] ?? fr[cle];
  return modele.replace(
    /\{(\w+)(?:\|(date|nombre))?\}/g,
    (_, nom: string, format?: string) => {
      const valeur = parametres[nom];
      if (format === 'date') {
        return new Date(valeur as string).toLocaleDateString(LOCALES[langue]);
      }
      if (format === 'nombre') {
        return Number(valeur).toLocaleString(LOCALES[langue]);
      }
      return valeurTexte(valeur, langue);
    },
  );
}

// Traduit un texte produit par m() ; tout autre texte est renvoyé tel quel.
export function traduireTexte(langue: Langue, texte: string): string {
  if (!texte.startsWith(PREFIXE)) return texte;
  const reste = texte.slice(PREFIXE.length);
  const separateur = reste.indexOf('§');
  const cle = separateur === -1 ? reste : reste.slice(0, separateur);
  if (!estCle(cle)) return texte;
  let parametres: ParametresMessage = {};
  if (separateur !== -1) {
    try {
      parametres = JSON.parse(reste.slice(separateur + 1)) as ParametresMessage;
    } catch {
      return texte;
    }
  }
  return traduire(langue, cle, parametres);
}

export function estMessageCode(texte: unknown): texte is string {
  return typeof texte === 'string' && texte.startsWith(PREFIXE);
}
