import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  creerApplication,
  creerCagnotte,
  creerOrganisateur,
  creerUtilisateur,
  entete,
  viderBase,
} from './outils';

describe('Retraits (e2e)', () => {
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

  function demander(jeton: string, idCagnotte: number, montant: number) {
    return request(app.getHttpServer())
      .post('/retraits')
      .set(entete(jeton))
      .send({ id_cagnotte: idCagnotte, montant });
  }

  it('refuse un retrait supérieur au solde disponible', async () => {
    const orga = await creerOrganisateur(prisma, jwt);
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 10000,
    });

    const reponse = await demander(orga.jeton, cagnotte.id_cagnotte, 12000);
    expect(reponse.status).toBe(400);
  });

  it('déduit les retraits en attente du solde disponible', async () => {
    const orga = await creerOrganisateur(prisma, jwt);
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 10000,
    });

    expect(
      (await demander(orga.jeton, cagnotte.id_cagnotte, 6000)).status,
    ).toBe(201);
    // 4 000 XAF restent disponibles : 5 000 est refusé, 4 000 est accepté.
    expect(
      (await demander(orga.jeton, cagnotte.id_cagnotte, 5000)).status,
    ).toBe(400);
    expect(
      (await demander(orga.jeton, cagnotte.id_cagnotte, 4000)).status,
    ).toBe(201);
    expect((await demander(orga.jeton, cagnotte.id_cagnotte, 100)).status).toBe(
      400,
    );
  });

  it("n'accepte qu'une demande quand deux arrivent en même temps sur le même solde", async () => {
    const orga = await creerOrganisateur(prisma, jwt);
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 10000,
    });

    const reponses = await Promise.all([
      demander(orga.jeton, cagnotte.id_cagnotte, 7000),
      demander(orga.jeton, cagnotte.id_cagnotte, 7000),
      demander(orga.jeton, cagnotte.id_cagnotte, 7000),
    ]);
    expect(reponses.map((r) => r.status).sort()).toEqual([201, 400, 400]);
    expect(
      await prisma.retrait.count({
        where: { id_cagnotte: cagnotte.id_cagnotte },
      }),
    ).toBe(1);
  });

  it("refuse un retrait sur une cagnotte suspendue ou d'un autre utilisateur", async () => {
    const orga = await creerOrganisateur(prisma, jwt);
    const autre = await creerOrganisateur(prisma, jwt);
    const suspendue = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 10000,
      statut: 'SUSPENDUE',
    });
    const active = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 10000,
    });

    expect(
      (await demander(orga.jeton, suspendue.id_cagnotte, 1000)).status,
    ).toBe(400);
    expect((await demander(autre.jeton, active.id_cagnotte, 1000)).status).toBe(
      403,
    );
  });

  it('ne traite un retrait qu’une seule fois, même en cas de double clic', async () => {
    const orga = await creerOrganisateur(prisma, jwt);
    const admin = await creerUtilisateur(prisma, jwt, { admin: true });
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 10000,
    });
    const demande = await demander(orga.jeton, cagnotte.id_cagnotte, 3000);
    const id = (demande.body as { id_retrait: number }).id_retrait;

    const traiter = () =>
      request(app.getHttpServer())
        .post(`/retraits/${id}/traiter`)
        .set(entete(admin.jeton));
    const reponses = await Promise.all([traiter(), traiter()]);
    expect(reponses.map((r) => r.status).sort()).toEqual([201, 400]);

    // Un retrait traité ne peut plus être rejeté.
    const rejet = await request(app.getHttpServer())
      .post(`/retraits/${id}/rejeter`)
      .set(entete(admin.jeton))
      .send({ motif_rejet: 'Test' });
    expect(rejet.status).toBe(400);
    expect(
      (await prisma.retrait.findUnique({ where: { id_retrait: id } }))?.statut,
    ).toBe('TRAITE');
  });

  it('réserve le traitement aux administrateurs', async () => {
    const orga = await creerOrganisateur(prisma, jwt);
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 10000,
    });
    const demande = await demander(orga.jeton, cagnotte.id_cagnotte, 1000);
    const id = (demande.body as { id_retrait: number }).id_retrait;

    const reponse = await request(app.getHttpServer())
      .post(`/retraits/${id}/traiter`)
      .set(entete(orga.jeton));
    expect(reponse.status).toBe(403);
  });
});
