import { langueDepuisEntete } from './langues';
import { m, traduire, traduireTexte } from './messages';
import { fr } from './fr';
import { en } from './en';

describe('langueDepuisEntete', () => {
  it.each([
    [undefined, 'fr'],
    ['', 'fr'],
    ['fr', 'fr'],
    ['en', 'en'],
    ['en-GB,en;q=0.9,fr;q=0.8', 'en'],
    ['fr-CM,fr;q=0.9,en;q=0.8', 'fr'],
    ['de, en;q=0.8, fr;q=0.5', 'en'],
    ['en;q=0.2, fr;q=0.9', 'fr'],
    ['de, es', 'fr'], // aucune langue gérée : français
    ['en;q=0', 'fr'],
  ])('%s → %s', (entete, langue) => {
    expect(langueDepuisEntete(entete)).toBe(langue);
  });
});

describe('messages', () => {
  it('traduit un message sans paramètre dans chaque langue', () => {
    const message = m('auth.banni');
    expect(traduireTexte('fr', message)).toBe('Votre compte a été banni.');
    expect(traduireTexte('en', message)).toBe('Your account has been banned.');
  });

  it('remplace les paramètres, y compris un nom de champ traduit', () => {
    const message = m('validation.longueurMax', {
      champ: { cle: 'champs.titre' },
      max: 255,
    });
    expect(traduireTexte('fr', message)).toBe(
      'Le titre ne peut pas dépasser 255 caractères.',
    );
    expect(traduireTexte('en', message)).toBe(
      "The title can't be longer than 255 characters.",
    );
  });

  it('formate les dates selon la langue', () => {
    const parametres = { fin: '2026-12-25T00:00:00.000Z' };
    expect(traduire('fr', 'auth.suspenduJusquAu', parametres)).toContain(
      '25/12/2026',
    );
    expect(traduire('en', 'auth.suspenduJusquAu', parametres)).toContain(
      '25/12/2026',
    );
  });

  it('laisse tel quel un texte qui ne vient pas de m()', () => {
    expect(traduireTexte('en', 'Texte libre')).toBe('Texte libre');
    // Un paramètre venant d'un utilisateur peut contenir le séparateur.
    expect(
      traduireTexte('fr', m('partage.soutenez', { titre: 'A § B {x}' })),
    ).toContain('« A § B {x} »');
  });

  it('a les mêmes paramètres dans les deux langues', () => {
    const parametres = (texte: string) =>
      [...texte.matchAll(/\{(\w+)(?:\|\w+)?\}/g)].map((r) => r[1]).sort();
    for (const cle of Object.keys(fr) as (keyof typeof fr)[]) {
      expect([cle, parametres(en[cle])]).toEqual([cle, parametres(fr[cle])]);
    }
  });
});
