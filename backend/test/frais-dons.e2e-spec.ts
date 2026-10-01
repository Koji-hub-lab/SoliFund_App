import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { FauxNotchPay } from './faux-notchpay';
import {
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  validerIdentite,
  viderBase,
} from './outils';

// Frais de transaction payés par le donateur : calcul public, total demandé au fournisseur, total
// vérifié à la validation, et cagnotte augmentée du seul montant du don. Tarifs d'AangaraaPay
// (les autres tests mettent les frais à zéro, voir environnement.ts).
const TARIFS: Record<string, string> = {
  FRAIS_MTN_ENCAISSEMENT_POURCENT: '1.7',
  FRAIS_MTN_VERSEMENT_POURCENT: '1.3',
  FRAIS_ORANGE_ENCAISSEMENT_POURCENT: '1.5',
  FRAIS_ORANGE_VERSEMENT_POURCENT: '2.1',
};

type Frais = {
  montant_don: number;
  montant_frais: number;
  montant_total: number;
};

describe('Frais de transaction des dons (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let notchPay: FauxNotchPay;
  // Cagnottes d'organisateurs dont le retrait vérifié est MTN, Orange, ou pas encore connu.
  const cagnottes: Record<'mtn' | 'orange' | 'inconnu', number> = {
    mtn: 0,
    orange: 0,
    inconnu: 0,
  };
  let adresse = 0;

  beforeAll(async () => {
    Object.assign(process.env, TARIFS);
    ({ app, prisma, jwt, notchPay } = await creerApplication());
    await viderBase(prisma);

    const orgaMtn = await creerUtilisateur(prisma, jwt);
    const identite = await validerIdentite(
      prisma,
      orgaMtn.id_utilisateur,
      '670000001',
    );
    await prisma.verificationIdentite.update({
      where: { id_verification: identite.id_verification },
      data: { methode_retrait: 'MTN_MOBILE_MONEY' },
    });
    cagnottes.mtn = (
      await creerCagnotte(prisma, orgaMtn.id_utilisateur)
    ).id_cagnotte;

    const orgaOrange = await creerUtilisateur(prisma, jwt);
    await validerIdentite(prisma, orgaOrange.id_utilisateur, '690000001');
    cagnottes.orange = (
      await creerCagnotte(prisma, orgaOrange.id_utilisateur)
    ).id_cagnotte;

    // Vérification encore en attente : l'opérateur de retrait n'est pas vérifié.
    const orgaInconnu = await creerUtilisateur(prisma, jwt);
    await validerIdentite(
      prisma,
      orgaInconnu.id_utilisateur,
      '670000002',
      'EN_ATTENTE',
    );
    cagnottes.inconnu = (
      await creerCagnotte(prisma, orgaInconnu.id_utilisateur)
    ).id_cagnotte;
  });

  beforeEach(() => {
    notchPay.reinitialiser();
  });

  afterAll(async () => {
    for (const nom of Object.keys(TARIFS)) process.env[nom] = '0';
    await app.close();
  });

  const calculer = (idCagnotte: number, montant: number, methode: string) =>
    request(app.getHttpServer())
      .get('/dons/frais')
      .query({ id_cagnotte: idCagnotte, montant, methode_paiement: methode });

  const collecte = async (idCagnotte: number) =>
    Number(
      (
        await prisma.cagnotte.findUniqueOrThrow({
          where: { id_cagnotte: idCagnotte },
        })
      ).montant_collecte,
    );

  // Numéro MTN se terminant par 0 : le faux Notch Pay confirme le paiement.
  async function donner(idCagnotte: number, montant: number) {
    const donateur = await creerUtilisateur(prisma, jwt);
    adresse += 1;
    const reponse = await request(app.getHttpServer())
      .post('/dons')
      .set(entete(donateur.jeton))
      .set('X-Forwarded-For', `10.4.0.${adresse}`)
      .send({
        id_cagnotte: idCagnotte,
        montant,
        methode_paiement: 'MTN_MOBILE_MONEY',
        numero_payeur: '670000000',
      });
    expect(reponse.status).toBe(201);
    return { donateur, don: reponse.body as { id_don: number } & Frais };
  }

  const verifier = async (idDon: number, jeton: string) =>
    (
      await request(app.getHttpServer())
        .post(`/dons/${idDon}/verifier-statut`)
        .set(entete(jeton))
    ).body as { statut: string; code_erreur?: string };

  it.each([
    ['mtn', 'MTN_MOBILE_MONEY', 30],
    ['orange', 'MTN_MOBILE_MONEY', 38],
    ['mtn', 'ORANGE_MONEY', 28],
    ['orange', 'ORANGE_MONEY', 36],
  ] as const)(
    'GET /dons/frais (public) : retrait %s, donateur %s → %i XAF pour 1 000 XAF',
    async (cagnotte, methode, frais) => {
      const reponse = await calculer(cagnottes[cagnotte], 1000, methode);
      expect(reponse.status).toBe(200);
      expect(reponse.body).toMatchObject({
        montant_don: 1000,
        montant_frais: frais,
        montant_total: 1000 + frais,
        devise: 'XAF',
      });
    },
  );

  it('opérateur de retrait pas encore vérifié : taux de versement le plus élevé', async () => {
    expect(
      (await calculer(cagnottes.inconnu, 1000, 'MTN_MOBILE_MONEY')).body,
    ).toMatchObject({ montant_frais: 38, montant_total: 1038 });
    expect(
      (await calculer(cagnottes.inconnu, 1000, 'ORANGE_MONEY')).body,
    ).toMatchObject({ montant_frais: 36, montant_total: 1036 });
  });

  it('arrondit au supérieur, et applique le minimum au don (pas au total)', async () => {
    expect(
      (await calculer(cagnottes.orange, 1001, 'MTN_MOBILE_MONEY')).body,
    ).toMatchObject({ montant_frais: 39, montant_total: 1040 });
    expect(
      (await calculer(cagnottes.orange, 100, 'MTN_MOBILE_MONEY')).status,
    ).toBe(200);
    expect(
      (await calculer(cagnottes.orange, 99, 'MTN_MOBILE_MONEY')).status,
    ).toBe(400);
    expect((await calculer(999_999, 1000, 'MTN_MOBILE_MONEY')).status).toBe(
      404,
    );
  });

  it('demande le total au fournisseur, puis n’ajoute que le don à la cagnotte', async () => {
    const avant = await collecte(cagnottes.orange);
    const { don, donateur } = await donner(cagnottes.orange, 1000);
    expect(don).toMatchObject({
      montant: 1000,
      montant_frais: 38,
      montant_total: 1038,
    });
    expect(notchPay.paiements[0].nouveau.montant).toBe(1038);
    const enBase = await prisma.don.findUniqueOrThrow({
      where: { id_don: don.id_don },
      include: { paiement: true },
    });
    expect(Number(enBase.montant_don)).toBe(1000);
    expect(Number(enBase.montant_frais)).toBe(38);
    expect(Number(enBase.montant_total)).toBe(1038);
    expect(Number(enBase.paiement.montant)).toBe(1038);

    expect((await verifier(don.id_don, donateur.jeton)).statut).toBe('VALIDE');
    expect(await collecte(cagnottes.orange)).toBe(avant + 1000);

    // Liste publique et notification de l'organisateur : le montant du don, sans les frais.
    const liste = await request(app.getHttpServer()).get(
      `/dons/cagnotte/${cagnottes.orange}`,
    );
    expect(
      (liste.body as { donnees: { id_don: number; montant: string }[] }).donnees
        .filter((d) => d.id_don === don.id_don)
        .map((d) => Number(d.montant)),
    ).toEqual([1000]);
  });

  it('refuse de valider un paiement confirmé pour le seul montant du don (sans les frais)', async () => {
    const avant = await collecte(cagnottes.mtn);
    const { don, donateur } = await donner(cagnottes.mtn, 1000);
    expect(notchPay.paiements[0].nouveau.montant).toBe(1030);
    notchPay.montantRenvoye = 1000;
    expect(await verifier(don.id_don, donateur.jeton)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'MONTANT_INCOHERENT',
    });
    expect(await collecte(cagnottes.mtn)).toBe(avant);
  });

  it('Revenus : les frais encaissés sont comptés à côté des commissions, par mois', async () => {
    const admin = await creerUtilisateur(prisma, jwt, { admin: true });
    const reponse = await request(app.getHttpServer())
      .get('/admin/revenus')
      .set(entete(admin.jeton));
    expect(reponse.status).toBe(200);
    const corps = reponse.body as {
      total: number;
      total_frais: number;
      frais_mois_en_cours: number;
      mois_en_cours: string;
      par_mois: { mois: string; frais: number; nombre_dons: number }[];
    };
    // Un seul don validé dans ce fichier : 38 XAF de frais (le don refusé ne compte pas).
    expect(corps.total).toBe(0);
    expect(corps.total_frais).toBe(38);
    expect(corps.frais_mois_en_cours).toBe(38);
    expect(
      corps.par_mois.find((m) => m.mois === corps.mois_en_cours),
    ).toMatchObject({ frais: 38, nombre_dons: 1, total: 0, nombre: 0 });
  });
});
