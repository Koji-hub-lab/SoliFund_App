import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthService, ErreurConnexionGoogle } from '../src/auth/auth.service';
import { ProfilGoogle } from '../src/auth/google.strategy';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  MOT_DE_PASSE,
  creerApplication,
  creerUtilisateur,
  entete,
  viderBase,
} from './outils';

// Règles de compte de la connexion avec Google (le passage par Google lui-même n'est pas testable
// ici) et comptes sans mot de passe. Google n'est pas configuré dans ce fichier.
describe('Connexion avec Google (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let auth: AuthService;
  let numero = 0;

  function profil(donnees: Partial<ProfilGoogle> = {}): ProfilGoogle {
    numero += 1;
    return {
      google_id: `google-${numero}-${Date.now()}`,
      email: `google${numero}-${Date.now()}@gmail.test`,
      email_verifie: true,
      prenom: 'Awa',
      nom: 'Ngono',
      ...donnees,
    };
  }

  async function motifRefus(p: ProfilGoogle) {
    try {
      await auth.connexionGoogle(p);
      return null;
    } catch (e) {
      return e instanceof ErreurConnexionGoogle ? e.motif : 'autre';
    }
  }

  beforeAll(async () => {
    ({ app, prisma, jwt } = await creerApplication());
    auth = app.get(AuthService);
    await viderBase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('crée un compte vérifié, sans mot de passe, pour un nouvel utilisateur Google', async () => {
    const p = profil();
    const jeton = await auth.connexionGoogle(p);

    const compte = await prisma.utilisateur.findUniqueOrThrow({
      where: { google_id: p.google_id },
      include: { posseders: { include: { role: true } } },
    });
    expect(compte).toMatchObject({
      email: p.email,
      prenom: 'Awa',
      nom: 'Ngono',
      est_verifie: true,
      mot_de_passe: null,
    });
    expect(compte.posseders.map((x) => x.role.nom)).toEqual(['ROLE_USER']);

    const moi = await request(app.getHttpServer())
      .get('/utilisateurs/moi')
      .set(entete(jeton));
    expect(moi.status).toBe(200);
    expect(moi.body).toMatchObject({ email: p.email, a_mot_de_passe: false });
    expect(moi.body).not.toHaveProperty('mot_de_passe');
  });

  it('reconnecte le même compte au deuxième passage', async () => {
    const p = profil();
    await auth.connexionGoogle(p);
    await auth.connexionGoogle(p);
    expect(await prisma.utilisateur.count({ where: { email: p.email! } })).toBe(
      1,
    );
  });

  it('lie un compte existant de même email quand Google l’indique comme vérifié', async () => {
    const existant = await creerUtilisateur(prisma, jwt);
    const p = profil({ email: existant.email.toUpperCase() });
    await auth.connexionGoogle(p);

    const apres = await prisma.utilisateur.findUniqueOrThrow({
      where: { id_utilisateur: existant.id_utilisateur },
    });
    expect(apres.google_id).toBe(p.google_id);
    expect(apres.mot_de_passe).not.toBeNull();
    expect(
      await prisma.utilisateur.count({ where: { email: existant.email } }),
    ).toBe(1);
  });

  it('refuse de lier ou de créer un compte si Google n’a pas vérifié l’email', async () => {
    const existant = await creerUtilisateur(prisma, jwt);
    expect(
      await motifRefus(profil({ email: existant.email, email_verifie: false })),
    ).toBe('email-non-verifie');
    expect(await motifRefus(profil({ email_verifie: false }))).toBe(
      'email-non-verifie',
    );
    expect(
      (
        await prisma.utilisateur.findUniqueOrThrow({
          where: { id_utilisateur: existant.id_utilisateur },
        })
      ).google_id,
    ).toBeNull();
  });

  it('refuse de remplacer le compte Google déjà lié à un compte', async () => {
    const premier = profil();
    await auth.connexionGoogle(premier);
    expect(await motifRefus(profil({ email: premier.email }))).toBe('deja-lie');
  });

  it('applique les règles de statut : banni, suspendu', async () => {
    const banni = await creerUtilisateur(prisma, jwt, { statut: 'BANNI' });
    expect(await motifRefus(profil({ email: banni.email }))).toBe('banni');

    const suspendu = await creerUtilisateur(prisma, jwt, {
      statut: 'SUSPENDU',
      dateFinSuspension: new Date(Date.now() + 86_400_000),
    });
    expect(await motifRefus(profil({ email: suspendu.email }))).toBe(
      'suspendu',
    );
  });

  it('refuse proprement la connexion par mot de passe d’un compte créé avec Google', async () => {
    const p = profil();
    await auth.connexionGoogle(p);
    const reponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: p.email, mot_de_passe: 'nimporte-quoi' });
    expect(reponse.status).toBe(401);
    expect((reponse.body as { message: string }).message).toContain(
      'Ce compte utilise la connexion Google',
    );
  });

  it('permet de définir un mot de passe sans ancien mot de passe, puis de se connecter avec', async () => {
    const p = profil();
    const jeton = await auth.connexionGoogle(p);
    await new Promise((r) => setTimeout(r, 1100)); // iat est en secondes

    const definition = await request(app.getHttpServer())
      .patch('/utilisateurs/moi/mot-de-passe')
      .set(entete(jeton))
      .send({ nouveau_mot_de_passe: MOT_DE_PASSE });
    expect(definition.status).toBe(200);
    expect((definition.body as { message: string }).message).toBe(
      'Mot de passe défini.',
    );

    const connexion = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: p.email, mot_de_passe: MOT_DE_PASSE });
    expect(connexion.status).toBe(201);
  });

  it('exige toujours l’ancien mot de passe pour un compte qui en a un', async () => {
    const utilisateur = await creerUtilisateur(prisma, jwt);
    const reponse = await request(app.getHttpServer())
      .patch('/utilisateurs/moi/mot-de-passe')
      .set(entete(utilisateur.jeton))
      .send({ nouveau_mot_de_passe: 'nouveau-mot-de-passe' });
    expect(reponse.status).toBe(400);
  });

  it('sans configuration Google, /auth/google et le retour renvoient vers /login?erreur=google', async () => {
    for (const chemin of [
      '/auth/google',
      '/auth/google/callback?code=abc&state=xyz',
    ]) {
      const reponse = await request(app.getHttpServer()).get(chemin);
      expect(reponse.status).toBe(302);
      expect(reponse.headers.location).toMatch(/\/login\?erreur=google$/);
    }
  });
});
