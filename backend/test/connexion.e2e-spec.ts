import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { MOT_DE_PASSE, creerApplication, creerUtilisateur, entete, viderBase } from './outils';

// Attention : /auth/login est limité à 5 appels par minute ; ce fichier en fait 4.
describe('Connexion et jetons (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await creerApplication());
    await viderBase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  function connecter(email: string, motDePasse = MOT_DE_PASSE) {
    return request(app.getHttpServer()).post('/auth/login').send({ email, mot_de_passe: motDePasse });
  }

  it('refuse la connexion d’un compte banni', async () => {
    const banni = await creerUtilisateur(prisma, jwt, { statut: 'BANNI' });
    const reponse = await connecter(banni.email);
    expect(reponse.status).toBe(401);
    expect((reponse.body as { message: string }).message).toBe('Votre compte a été banni.');
  });

  it('refuse le jeton d’un compte banni après sa connexion', async () => {
    const utilisateur = await creerUtilisateur(prisma, jwt);
    expect((await request(app.getHttpServer()).get('/utilisateurs/moi').set(entete(utilisateur.jeton))).status).toBe(200);

    await prisma.utilisateur.update({ where: { id_utilisateur: utilisateur.id_utilisateur }, data: { statut: 'BANNI' } });
    expect((await request(app.getHttpServer()).get('/utilisateurs/moi').set(entete(utilisateur.jeton))).status).toBe(401);
  });

  it('lève une suspension arrivée à échéance à la connexion', async () => {
    const suspendu = await creerUtilisateur(prisma, jwt, { statut: 'SUSPENDU', dateFinSuspension: new Date(Date.now() - 60_000) });
    expect((await connecter(suspendu.email)).status).toBe(201);
    expect((await prisma.utilisateur.findUniqueOrThrow({ where: { id_utilisateur: suspendu.id_utilisateur } })).statut).toBe('ACTIF');
  });

  it('refuse un jeton émis avant un changement de mot de passe, accepte le nouveau', async () => {
    const utilisateur = await creerUtilisateur(prisma, jwt);
    const ancienJeton = utilisateur.jeton;
    // iat est en secondes : le changement doit avoir lieu au moins une seconde après l'émission.
    await new Promise((r) => setTimeout(r, 1100));

    const changement = await request(app.getHttpServer())
      .patch('/utilisateurs/moi/mot-de-passe')
      .set(entete(ancienJeton))
      .send({ ancien_mot_de_passe: MOT_DE_PASSE, nouveau_mot_de_passe: 'nouveau-mot-de-passe' });
    expect(changement.status).toBe(200);

    const refus = await request(app.getHttpServer()).get('/utilisateurs/moi').set(entete(ancienJeton));
    expect(refus.status).toBe(401);
    expect((refus.body as { message: string }).message).toBe('Votre mot de passe a été modifié. Reconnectez-vous.');

    expect((await connecter(utilisateur.email)).status).toBe(401);
    const connexion = await connecter(utilisateur.email, 'nouveau-mot-de-passe');
    expect(connexion.status).toBe(201);
    const nouveauJeton = (connexion.body as { access_token: string }).access_token;
    expect((await request(app.getHttpServer()).get('/utilisateurs/moi').set(entete(nouveauJeton))).status).toBe(200);
  });

  it('refuse un changement de mot de passe avec un mot de passe actuel faux (400, sans déconnecter)', async () => {
    const utilisateur = await creerUtilisateur(prisma, jwt);
    const reponse = await request(app.getHttpServer())
      .patch('/utilisateurs/moi/mot-de-passe')
      .set(entete(utilisateur.jeton))
      .send({ ancien_mot_de_passe: 'faux-mot-de-passe', nouveau_mot_de_passe: 'nouveau-mot-de-passe' });
    expect(reponse.status).toBe(400);
  });
});
