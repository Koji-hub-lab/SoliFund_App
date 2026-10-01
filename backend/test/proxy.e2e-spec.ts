import type { INestApplication } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import * as outils from './outils';

// TRUST_PROXY : avec un proxy de confiance, les limites par adresse IP (ThrottlerGuard, ici celle
// des signalements : 3 par minute) utilisent l'adresse du visiteur lue dans X-Forwarded-For ; avec
// 0 (par défaut), l'en-tête est ignoré et ne permet pas de contourner les limites.
describe.each([
  ['1', 'utilise la vraie adresse du visiteur'],
  ['0', 'ignore X-Forwarded-For'],
])('TRUST_PROXY=%s (e2e)', (valeur, description) => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    // Lu au démarrage de chaque application (configurerApplication).
    process.env.TRUST_PROXY = valeur;
    ({ app, prisma, jwt } = await outils.creerApplication());
    await outils.viderBase(prisma);
  });

  afterAll(async () => {
    process.env.TRUST_PROXY = '1';
    await app.close();
  });

  it(description, async () => {
    const orga = await outils.creerUtilisateur(prisma, jwt);
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(
        (await outils.creerCagnotte(prisma, orga.id_utilisateur)).id_cagnotte,
      );
    }
    const signaler = (id: number, adresse: string) =>
      request(app.getHttpServer())
        .post(`/cagnottes/${id}/signaler`)
        .set('X-Forwarded-For', adresse)
        .send({ motif: 'ARNAQUE' });

    const statuts: number[] = [];
    for (const id of ids.slice(0, 3)) {
      statuts.push((await signaler(id, '41.202.1.1')).status);
    }
    // 4e signalement : même visiteur, puis un autre visiteur (autre adresse).
    statuts.push((await signaler(ids[3], '41.202.1.1')).status);
    statuts.push((await signaler(ids[4], '41.202.2.2')).status);

    expect(statuts).toEqual(
      valeur === '1'
        ? [201, 201, 201, 429, 201] // le second visiteur a sa propre limite
        : [201, 201, 201, 429, 429], // une seule adresse vue : l'en-tête ne change rien
    );
  });
});
