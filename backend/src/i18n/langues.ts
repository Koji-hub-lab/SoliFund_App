// Langues de l'interface et des messages renvoyés au client.
export const LANGUES = ['fr', 'en'] as const;
export type Langue = (typeof LANGUES)[number];
export const LANGUE_DEFAUT: Langue = 'fr';

// Format des dates et des nombres (mêmes réglages que le frontend).
export const LOCALES: Record<Langue, string> = { fr: 'fr-FR', en: 'en-GB' };

export function estLangue(valeur: unknown): valeur is Langue {
  return LANGUES.includes(valeur as Langue);
}

// Langue demandée par l'en-tête Accept-Language (« en-GB,en;q=0.9,fr;q=0.8 » → « en ») :
// la première langue gérée, par ordre de préférence ; le français sinon.
export function langueDepuisEntete(entete: unknown): Langue {
  if (typeof entete !== 'string') return LANGUE_DEFAUT;
  const preferences = entete
    .split(',')
    .map((partie, rang) => {
      const [etiquette, ...options] = partie.trim().split(';');
      const q = options
        .map((o) => /^\s*q=([0-9.]+)\s*$/.exec(o)?.[1])
        .find((v) => v !== undefined);
      const poids = q === undefined ? 1 : Number(q);
      return {
        langue: etiquette.trim().toLowerCase().split('-')[0],
        poids: Number.isFinite(poids) ? poids : 0,
        rang,
      };
    })
    .filter((p) => p.poids > 0)
    .sort((a, b) => b.poids - a.poids || a.rang - b.rang);
  return preferences.map((p) => p.langue).find(estLangue) ?? LANGUE_DEFAUT;
}
