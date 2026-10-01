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

// Montant minimum d'un don réglable par DON_MONTANT_MINIMUM : exposé par GET /configuration et
// appliqué par la validation du don (avant tout appel au fournisseur de paiement).
describe('Montant minimum d’un don (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let idCagnotte: number;
  let jeton: string;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await creerApplication());
    await viderBase(prisma);
    const orga = await creerUtilisateur(prisma, jwt);
    idCagnotte = (await creerCagnotte(prisma, orga.id_utilisateur)).id_cagnotte;
    jeton = (await creerUtilisateur(prisma, jwt)).jeton;
  });

  afterEach(() => {
    process.env.DON_MONTANT_MINIMUM = '100';
  });

  afterAll(async () => {
    await app.close();
  });

  const donner = (montant: number) =>
    request(app.getHttpServer())
      .post('/dons')
      .set(entete(jeton))
      .set('Accept-Language', 'fr')
      .send({
        id_cagnotte: idCagnotte,
        montant,
        methode_paiement: 'MTN_MOBILE_MONEY',
        numero_payeur: '677123456',
      });

  const message = (reponse: request.Response) =>
    ([] as string[]).concat((reponse.body as { message: string[] }).message);

  it('GET /configuration est public et donne le minimum (100 par défaut)', async () => {
    const reponse = await request(app.getHttpServer()).get('/configuration');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ don_montant_minimum: 100 });
  });

  it('refuse un don sous le minimum, avec le minimum dans le message', async () => {
    const reponse = await donner(99);
    expect(reponse.status).toBe(400);
    expect(message(reponse)).toContain(
      "Le montant du don doit être d'au moins 100 XAF.",
    );
  });

  it('applique la valeur de DON_MONTANT_MINIMUM, partout', async () => {
    process.env.DON_MONTANT_MINIMUM = '500';
    const configuration = await request(app.getHttpServer()).get(
      '/configuration',
    );
    expect(configuration.body).toEqual({ don_montant_minimum: 500 });

    const refuse = await donner(400);
    expect(refuse.status).toBe(400);
    expect(message(refuse)).toContain(
      "Le montant du don doit être d'au moins 500 XAF.",
    );
    // 500 XAF passe la validation (quoi que réponde ensuite le fournisseur, injoignable ici).
    const accepte = await donner(500);
    expect(message(accepte).join(' ')).not.toContain('au moins');
  });
});
