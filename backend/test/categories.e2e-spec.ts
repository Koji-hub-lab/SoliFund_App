import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  viderBase,
} from './outils';

describe('Catégories et santé de l’API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let admin: { jeton: string };
  let utilisateur: { id_utilisateur: number; jeton: string };

  beforeAll(async () => {
    ({ app, prisma, jwt } = await creerApplication());
    await viderBase(prisma);
    admin = await creerUtilisateur(prisma, jwt, { admin: true });
    utilisateur = await creerUtilisateur(prisma, jwt);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /sante répond { statut: "ok" }', async () => {
    const reponse = await request(app.getHttpServer()).get('/sante');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ statut: 'ok' });
  });

  it('crée, modifie et liste une catégorie (administrateur)', async () => {
    const creation = await request(app.getHttpServer())
      .post('/categories')
      .set(entete(admin.jeton))
      .send({ nom: '  Éducation  ', couleur: '#087F7A' });
    expect(creation.status).toBe(201);
    const id = (creation.body as { id_categorie: number }).id_categorie;
    expect((creation.body as { nom: string }).nom).toBe('Éducation');

    const modification = await request(app.getHttpServer())
      .patch(`/categories/${id}`)
      .set(entete(admin.jeton))
      .send({ nom: 'Scolarité', couleur: '#E9A23B' });
    expect(modification.status).toBe(200);

    const liste = await request(app.getHttpServer())
      .get('/categories/admin')
      .set(entete(admin.jeton));
    expect(liste.body).toEqual([
      expect.objectContaining({
        id_categorie: id,
        nom: 'Scolarité',
        couleur: '#E9A23B',
        nb_cagnottes: 0,
      }),
    ]);
  });

  it('refuse une couleur invalide et un nom déjà utilisé', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .set(entete(admin.jeton))
      .send({ nom: 'Santé' });

    const couleur = await request(app.getHttpServer())
      .post('/categories')
      .set(entete(admin.jeton))
      .send({ nom: 'Sport', couleur: 'rouge' });
    expect(couleur.status).toBe(400);

    const doublon = await request(app.getHttpServer())
      .post('/categories')
      .set(entete(admin.jeton))
      .send({ nom: 'Santé' });
    expect(doublon.status).toBe(409);
  });

  it('réserve la gestion des catégories aux administrateurs', async () => {
    const reponses = await Promise.all([
      request(app.getHttpServer())
        .post('/categories')
        .set(entete(utilisateur.jeton))
        .send({ nom: 'Voyage' }),
      request(app.getHttpServer())
        .get('/categories/admin')
        .set(entete(utilisateur.jeton)),
      request(app.getHttpServer()).delete('/categories/1'),
    ]);
    expect(reponses.map((r) => r.status)).toEqual([403, 403, 401]);
  });

  it('refuse de supprimer une catégorie utilisée, supprime une catégorie libre', async () => {
    const utilisee = await prisma.categorie.create({
      data: { nom: 'Mariage' },
    });
    const libre = await prisma.categorie.create({
      data: { nom: 'Funérailles' },
    });
    const cagnotte = await creerCagnotte(prisma, utilisateur.id_utilisateur);
    await prisma.cagnotte.update({
      where: { id_cagnotte: cagnotte.id_cagnotte },
      data: { id_categorie: utilisee.id_categorie },
    });

    const refus = await request(app.getHttpServer())
      .delete(`/categories/${utilisee.id_categorie}`)
      .set(entete(admin.jeton));
    expect(refus.status).toBe(409);

    const suppression = await request(app.getHttpServer())
      .delete(`/categories/${libre.id_categorie}`)
      .set(entete(admin.jeton));
    expect(suppression.status).toBe(200);
    expect(
      await prisma.categorie.findUnique({
        where: { id_categorie: libre.id_categorie },
      }),
    ).toBeNull();
  });
});
