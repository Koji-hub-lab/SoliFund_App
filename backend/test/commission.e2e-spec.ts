import type { INestApplication } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';

type Outils = typeof import('./outils');
type Retrait = {
  id_retrait: number;
  montant_brut: string;
  taux_commission: string;
  montant_commission: string;
  montant_net: string;
  numero_beneficiaire: string;
  methode_retrait: string;
  statut: string;
};

describe('Commission sur les retraits (e2e)', () => {
  let outils: Outils;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let admin: { id_utilisateur: number; jeton: string };
  const applications: INestApplication<App>[] = [];

  beforeAll(async () => {
    outils = await import('./outils');
    ({ app, prisma, jwt } = await outils.creerApplication());
    applications.push(app);
    await outils.viderBase(prisma);
    admin = await outils.creerUtilisateur(prisma, jwt, { admin: true });
  });

  afterAll(async () => {
    for (const a of applications) await a.close();
  });

  async function organisateurAvecCagnotte(collecte = 100000) {
    const orga = await outils.creerOrganisateur(prisma, jwt);
    const cagnotte = await outils.creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: collecte,
    });
    return { orga, cagnotte };
  }
  const demander = (
    application: INestApplication<App>,
    jeton: string,
    idCagnotte: number,
    montant: number,
  ) =>
    request(application.getHttpServer())
      .post('/retraits')
      .set(outils.entete(jeton))
      .send({ id_cagnotte: idCagnotte, montant });
  const montants = (r: Retrait) => ({
    brut: Number(r.montant_brut),
    taux: Number(r.taux_commission),
    commission: Number(r.montant_commission),
    net: Number(r.montant_net),
  });

  it('expose le taux en vigueur publiquement', async () => {
    const reponse = await request(app.getHttpServer()).get('/commission');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ taux_pourcent: 3 });
  });

  it('calcule la commission à la demande, arrondie à l’entier, et le net', async () => {
    const { orga, cagnotte } = await organisateurAvecCagnotte();
    const cas: [number, number, number][] = [
      [10000, 300, 9700],
      [150, 5, 145], // 4,5 XAF arrondis à 5
      [149, 4, 145], // 4,47 XAF arrondis à 4
      [184, 6, 178], // 5,52 XAF arrondis à 6
    ];
    for (const [brut, commission, net] of cas) {
      const reponse = await demander(
        app,
        orga.jeton,
        cagnotte.id_cagnotte,
        brut,
      );
      expect(reponse.status).toBe(201);
      expect(montants(reponse.body as Retrait)).toEqual({
        brut,
        taux: 3,
        commission,
        net,
      });
    }
  });

  it('calcule le disponible sur le brut, pas sur le net', async () => {
    const { orga, cagnotte } = await organisateurAvecCagnotte(10000);
    // 10 000 demandés : tout le disponible est engagé, même si 9 700 seulement seront versés.
    expect(
      (await demander(app, orga.jeton, cagnotte.id_cagnotte, 10000)).status,
    ).toBe(201);
    expect(
      (await demander(app, orga.jeton, cagnotte.id_cagnotte, 100)).status,
    ).toBe(400);

    const mes = await request(app.getHttpServer())
      .get('/cagnottes/mes')
      .set(outils.entete(orga.jeton));
    expect(
      (mes.body as { montant_disponible: number }[])[0].montant_disponible,
    ).toBe(0);
  });

  it('montre à l’administrateur le net à verser, le numéro vérifié et la méthode', async () => {
    const { orga, cagnotte } = await organisateurAvecCagnotte();
    const id = (
      (await demander(app, orga.jeton, cagnotte.id_cagnotte, 20000))
        .body as Retrait
    ).id_retrait;

    const liste = await request(app.getHttpServer())
      .get('/retraits?statut=EN_ATTENTE&limite=50')
      .set(outils.entete(admin.jeton));
    const retrait = (liste.body as { donnees: Retrait[] }).donnees.find(
      (r) => r.id_retrait === id,
    )!;
    expect(montants(retrait)).toEqual({
      brut: 20000,
      taux: 3,
      commission: 600,
      net: 19400,
    });
    expect(retrait.numero_beneficiaire).toBe('699112233');
    expect(retrait.methode_retrait).toBe('ORANGE_MONEY');
  });

  it('enregistre la commission au registre quand le retrait est traité, pas quand il est rejeté', async () => {
    const { orga, cagnotte } = await organisateurAvecCagnotte();
    const traite = (
      (await demander(app, orga.jeton, cagnotte.id_cagnotte, 10000))
        .body as Retrait
    ).id_retrait;
    const rejete = (
      (await demander(app, orga.jeton, cagnotte.id_cagnotte, 5000))
        .body as Retrait
    ).id_retrait;
    expect(
      await prisma.commission.count({
        where: { id_cagnotte: cagnotte.id_cagnotte },
      }),
    ).toBe(0);

    const post = (chemin: string, corps?: object) =>
      request(app.getHttpServer())
        .post(chemin)
        .set(outils.entete(admin.jeton))
        .send(corps);
    expect(
      (await post(`/retraits/${traite}/traiter`, { hors_plateforme: true }))
        .status,
    ).toBe(201);
    expect(
      (await post(`/retraits/${rejete}/rejeter`, { motif_rejet: 'Test' }))
        .status,
    ).toBe(201);
    // Un double clic ne crée pas deux lignes.
    expect(
      (await post(`/retraits/${traite}/traiter`, { hors_plateforme: true }))
        .status,
    ).toBe(400);

    const registre = await prisma.commission.findMany({
      where: { id_cagnotte: cagnotte.id_cagnotte },
    });
    expect(registre).toHaveLength(1);
    expect(registre[0]).toMatchObject({
      id_retrait: traite,
      id_cagnotte: cagnotte.id_cagnotte,
    });
    expect(Number(registre[0].montant)).toBe(300);
    expect(Number(registre[0].taux)).toBe(3);

    // La transaction de retrait enregistre la somme réellement versée : le net.
    const versement = await prisma.transaction.findFirstOrThrow({
      where: { id_retrait: traite },
    });
    expect(Number(versement.montant)).toBe(9700);

    const notification = await prisma.recevoir.findFirstOrThrow({
      where: {
        id_utilisateur: orga.id_utilisateur,
        notification: { code: 'RETRAIT_TRAITE' },
      },
      include: { notification: true },
    });
    // La notification porte un code et des paramètres : le texte est affiché par le frontend.
    expect(notification.notification.parametres).toEqual({
      brut: 10000,
      net: 9700,
      commission: 300,
      devise: 'XAF',
      numero: '699112233',
    });
  });

  it('donne à l’administrateur les revenus : total, mois en cours, par mois et liste détaillée', async () => {
    const attendu = Number(
      (await prisma.commission.aggregate({ _sum: { montant: true } }))._sum
        .montant,
    );
    // Une commission d'un mois précédent.
    const { orga, cagnotte } = await organisateurAvecCagnotte();
    const ancien = (
      (await demander(app, orga.jeton, cagnotte.id_cagnotte, 40000))
        .body as Retrait
    ).id_retrait;
    await request(app.getHttpServer())
      .post(`/retraits/${ancien}/traiter`)
      .set(outils.entete(admin.jeton))
      .send({ hors_plateforme: true });
    await prisma.commission.update({
      where: { id_retrait: ancien },
      data: { date: new Date('2026-03-15T10:00:00Z') },
    });

    const revenus = await request(app.getHttpServer())
      .get('/admin/revenus')
      .set(outils.entete(admin.jeton));
    expect(revenus.status).toBe(200);
    const corps = revenus.body as {
      total: number;
      mois_en_cours: string;
      total_mois_en_cours: number;
      par_mois: { mois: string; total: number; nombre: number }[];
    };
    expect(corps.total).toBe(attendu + 1200);
    expect(corps.total_mois_en_cours).toBe(attendu);
    expect(corps.par_mois.find((m) => m.mois === '2026-03')).toMatchObject({
      mois: '2026-03',
      total: 1200,
      nombre: 1,
    });
    expect(corps.par_mois[0].mois).toBe(corps.mois_en_cours);

    const liste = await request(app.getHttpServer())
      .get('/admin/revenus/commissions')
      .set(outils.entete(admin.jeton));
    const lignes = (
      liste.body as {
        donnees: {
          montant: string;
          cagnotte: { titre: string };
          retrait: { id_retrait: number };
        }[];
      }
    ).donnees;
    expect(lignes.map((l) => l.retrait.id_retrait)).toContain(ancien);
    expect(lignes[0].cagnotte.titre).toBeTruthy();

    const stats = await request(app.getHttpServer())
      .get('/admin/statistiques')
      .set(outils.entete(admin.jeton));
    expect(
      (stats.body as { commissions_du_mois: number }).commissions_du_mois,
    ).toBe(attendu);

    // Réservé aux administrateurs.
    for (const route of ['/admin/revenus', '/admin/revenus/commissions']) {
      expect(
        (
          await request(app.getHttpServer())
            .get(route)
            .set(outils.entete(orga.jeton))
        ).status,
      ).toBe(403);
    }
  });

  it('conserve l’historique quand le taux change : un retrait garde le taux de sa demande', async () => {
    const { orga, cagnotte } = await organisateurAvecCagnotte();
    const avant = (
      (await demander(app, orga.jeton, cagnotte.id_cagnotte, 10000))
        .body as Retrait
    ).id_retrait;

    // Le taux passe à 5 % : nouvelle instance de l'application avec la nouvelle configuration.
    jest.resetModules();
    process.env.COMMISSION_TAUX_POURCENT = '5';
    const outils5 = await import('./outils');
    const { app: app5 } = await outils5.creerApplication();
    applications.push(app5);
    expect(
      (await request(app5.getHttpServer()).get('/commission')).body,
    ).toEqual({ taux_pourcent: 5 });

    // Une nouvelle demande est à 5 %...
    const apres = await demander(app5, orga.jeton, cagnotte.id_cagnotte, 10000);
    expect(montants(apres.body as Retrait)).toEqual({
      brut: 10000,
      taux: 5,
      commission: 500,
      net: 9500,
    });

    // ... mais le retrait demandé à 3 % reste à 3 %, y compris quand il est traité après le changement.
    const traitement = await request(app5.getHttpServer())
      .post(`/retraits/${avant}/traiter`)
      .set(outils.entete(admin.jeton))
      .send({ hors_plateforme: true });
    expect(traitement.status).toBe(201);
    expect(montants(traitement.body as Retrait)).toEqual({
      brut: 10000,
      taux: 3,
      commission: 300,
      net: 9700,
    });
    const registre = await prisma.commission.findUniqueOrThrow({
      where: { id_retrait: avant },
    });
    expect([Number(registre.montant), Number(registre.taux)]).toEqual([300, 3]);
  });
});
