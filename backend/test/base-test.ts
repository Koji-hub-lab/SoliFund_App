import 'dotenv/config';

// Base de données des tests e2e : DATABASE_URL_TEST si elle est définie, sinon la base de
// développement suffixée par « _test » (même serveur, mêmes identifiants). L'URL n'est jamais affichée.
export function urlBaseTest(): string {
  const explicite = process.env.DATABASE_URL_TEST;
  const developpement =
    process.env.DATABASE_URL_DEVELOPPEMENT ?? process.env.DATABASE_URL;
  if (!explicite && !developpement) {
    throw new Error(
      'Définissez DATABASE_URL_TEST (ou DATABASE_URL) dans backend/.env pour lancer les tests e2e.',
    );
  }

  let url: URL;
  if (explicite) {
    url = new URL(explicite);
  } else {
    url = new URL(developpement!);
    url.pathname = `${url.pathname.replace(/\/+$/, '')}_test`;
  }

  // Les tests vident toutes les tables : on refuse toute base qui ne serait pas une base de test.
  const nom = nomBase(url.toString());
  if (!/test/i.test(nom)) {
    throw new Error(
      `La base des tests doit contenir « test » dans son nom (base actuelle : « ${nom} »).`,
    );
  }
  if (
    developpement &&
    nom === nomBase(developpement) &&
    new URL(developpement).host === url.host
  ) {
    throw new Error(
      'La base des tests ne doit pas être la base de développement.',
    );
  }
  return url.toString();
}

export function nomBase(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}
