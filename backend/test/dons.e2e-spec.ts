import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  creerApplication,
  creerCagnotte,
  creerDon,
  creerUtilisateur,
  entete,
  viderBase,
} from './outils';

describe('Validation des dons (e2e)', () => {
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

  it('ne compte un don qu’une seule fois quand il est validé deux fois en même temps', async () => {
    const orga = await creerUtilisateur(prisma, jwt);
    const donateur = await creerUtilisateur(prisma, jwt);
    const admin = await creerUtilisateur(prisma, jwt, { admin: true });
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur);
    const { don, paiement } = await creerDon(
      prisma,
      cagnotte.id_cagnotte,
      donateur.id_utilisateur,
      5000,
    );

    const valider = () =>
      request(app.getHttpServer())
        .post(`/dons/${don.id_don}/valider`)
        .set(entete(admin.jeton));
    const reponses = await Promise.all([valider(), valider(), valider()]);
    expect(reponses.map((r) => r.status).sort()).toEqual([201, 400, 400]);

    const apres = await prisma.cagnotte.findUniqueOrThrow({
      where: { id_cagnotte: cagnotte.id_cagnotte },
    });
    expect(Number(apres.montant_collecte)).toBe(5000);
    expect(
      await prisma.transaction.count({
        where: { id_paiement: paiement.id_paiement },
      }),
    ).toBe(1);
    // L'organisateur n'est notifié qu'une fois.
    expect(
      await prisma.recevoir.count({
        where: {
          id_utilisateur: orga.id_utilisateur,
          notification: { type: 'DON' },
        },
      }),
    ).toBe(1);
  });

  // Le paiement par Notch Pay (création, vérification, réconciliation) : dons-notchpay.e2e-spec.ts.
});
