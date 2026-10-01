import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

// Google configuré avec des identifiants factices (aucun appel réel à Google n'est fait) :
// redirection vers Google et protection par le paramètre « state ».
process.env.GOOGLE_CLIENT_ID = 'client-factice.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'secret-factice';
process.env.GOOGLE_CALLBACK_URL =
  'http://localhost:5173/api/auth/google/callback';

describe('Connexion avec Google configurée (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Import après la configuration des variables GOOGLE_* ci-dessus.
    const { creerApplication } = await import('./outils.js');
    ({ app } = await creerApplication());
  });

  afterAll(async () => {
    await app.close();
  });

  it('redirige vers Google avec un paramètre state gardé dans un cookie httpOnly', async () => {
    const reponse = await request(app.getHttpServer()).get('/auth/google');
    expect(reponse.status).toBe(302);

    const cible = new URL(reponse.headers.location);
    expect(cible.host).toBe('accounts.google.com');
    expect(cible.searchParams.get('client_id')).toBe(
      'client-factice.apps.googleusercontent.com',
    );
    expect(cible.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/auth/google/callback',
    );
    expect(cible.searchParams.get('scope')).toBe('openid email profile');

    const etat = cible.searchParams.get('state');
    const cookie = ([] as string[])
      .concat(reponse.headers['set-cookie'] ?? [])
      .join(';');
    expect(etat).toBeTruthy();
    expect(cookie).toContain(`solifund_google_etat=${etat}`);
    expect(cookie).toContain('HttpOnly');
  });

  it('refuse un retour dont le state ne correspond pas au cookie (login CSRF)', async () => {
    const reponse = await request(app.getHttpServer())
      .get('/auth/google/callback?code=code-factice&state=etat-falsifie')
      .set('Cookie', 'solifund_google_etat=autre-etat');
    expect(reponse.status).toBe(302);
    expect(reponse.headers.location).toMatch(/\/login\?erreur=google$/);
  });

  it('renvoie vers /login?erreur=google quand l’utilisateur annule sur Google', async () => {
    const reponse = await request(app.getHttpServer()).get(
      '/auth/google/callback?error=access_denied',
    );
    expect(reponse.status).toBe(302);
    expect(reponse.headers.location).toMatch(/\/login\?erreur=google$/);
  });
});
