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

type Personne = { jeton: string } | null;

describe('Visibilité des cagnottes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let orga: { id_utilisateur: number; jeton: string };
  let autre: { jeton: string };
  let admin: { jeton: string };
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    ({ app, prisma, jwt } = await creerApplication());
    await viderBase(prisma);
    orga = await creerUtilisateur(prisma, jwt);
    autre = await creerUtilisateur(prisma, jwt);
    admin = await creerUtilisateur(prisma, jwt, { admin: true });
    ids.publique = (
      await creerCagnotte(prisma, orga.id_utilisateur)
    ).id_cagnotte;
    ids.terminee = (
      await creerCagnotte(prisma, orga.id_utilisateur, { statut: 'TERMINEE' })
    ).id_cagnotte;
    ids.privee = (
      await creerCagnotte(prisma, orga.id_utilisateur, { est_publique: false })
    ).id_cagnotte;
    ids.suspendue = (
      await creerCagnotte(prisma, orga.id_utilisateur, { statut: 'SUSPENDUE' })
    ).id_cagnotte;
    ids.annulee = (
      await creerCagnotte(prisma, orga.id_utilisateur, { statut: 'ANNULEE' })
    ).id_cagnotte;
  });

  afterAll(async () => {
    await app.close();
  });

  function lire(chemin: string, qui: Personne) {
    const requete = request(app.getHttpServer()).get(chemin);
    return qui ? requete.set(entete(qui.jeton)) : requete;
  }

  const ROUTES = [
    '/cagnottes/:id',
    '/dons/cagnotte/:id',
    '/commentaires/cagnotte/:id',
    '/actualites/cagnotte/:id',
  ];

  it.each(ROUTES)(
    '%s : cagnottes publiques ACTIVE et TERMINEE visibles par un visiteur',
    async (route) => {
      expect(
        (await lire(route.replace(':id', String(ids.publique)), null)).status,
      ).toBe(200);
      expect(
        (await lire(route.replace(':id', String(ids.terminee)), null)).status,
      ).toBe(200);
    },
  );

  it.each(ROUTES)(
    '%s : cagnottes privée, suspendue, annulée : 404 pour un visiteur et un autre utilisateur',
    async (route) => {
      for (const cle of ['privee', 'suspendue', 'annulee']) {
        const chemin = route.replace(':id', String(ids[cle]));
        expect((await lire(chemin, null)).status).toBe(404);
        expect((await lire(chemin, autre)).status).toBe(404);
      }
    },
  );

  it.each(ROUTES)(
    '%s : visibles par le propriétaire et par un administrateur',
    async (route) => {
      for (const cle of ['privee', 'suspendue', 'annulee']) {
        const chemin = route.replace(':id', String(ids[cle]));
        expect((await lire(chemin, orga)).status).toBe(200);
        expect((await lire(chemin, admin)).status).toBe(200);
      }
    },
  );

  it("GET /cagnottes ne liste que les cagnottes publiques ACTIVE ou TERMINEE, quel que soit l'utilisateur", async () => {
    for (const qui of [null, autre, orga]) {
      const reponse = await lire('/cagnottes?limite=50', qui);
      const listees = (
        reponse.body as { donnees: { id_cagnotte: number }[] }
      ).donnees
        .map((c) => c.id_cagnotte)
        .sort();
      expect(listees).toEqual([ids.publique, ids.terminee].sort());
    }
  });

  it('« Mes cagnottes » ne montre que les cagnottes de l’utilisateur connecté', async () => {
    const miennes = (await lire('/cagnottes/mes', orga)).body as {
      id_cagnotte: number;
    }[];
    expect(miennes).toHaveLength(5);
    expect((await lire('/cagnottes/mes', autre)).body).toEqual([]);
    expect((await lire('/cagnottes/mes', null)).status).toBe(401);
  });

  it('le lien de partage d’une cagnotte privée ne révèle rien', async () => {
    const reponse = await lire(`/partage/cagnottes/${ids.privee}`, null);
    expect(reponse.status).toBe(200);
    expect(reponse.text).toContain(
      'SoliFund — Cagnottes solidaires au Cameroun',
    );
    expect(reponse.text).not.toContain('Cagnotte de test');
  });

  it('un commentaire sur une cagnotte privée est refusé (404) pour un autre utilisateur', async () => {
    const reponse = await request(app.getHttpServer())
      .post('/commentaires')
      .set(entete(autre.jeton))
      .send({ id_cagnotte: ids.privee, description: 'Bonjour' });
    expect(reponse.status).toBe(404);
  });
});
