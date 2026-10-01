import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { ErreurReseauPaiement } from '../src/payment/paiement.erreurs';
import { signerCorps } from '../src/payment/notchpay.signature';
import { PrismaService } from '../src/prisma/prisma.service';
import { FauxNotchPay } from './faux-notchpay';
import {
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  viderBase,
} from './outils';

// Hash des tests (test/environnement.ts).
const HASH = 'hsk_test_factice';

// Webhook Notch Pay. Le faux client décide du statut réel du paiement d'après le dernier chiffre
// du numéro (0 succès, 1 fonds insuffisants...) : le contenu du webhook n'est jamais cru.
describe('Webhook Notch Pay (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let notchPay: FauxNotchPay;
  let idCagnotte: number;
  let compteur = 0;

  beforeAll(async () => {
    ({ app, prisma, jwt, notchPay } = await creerApplication());
    await viderBase(prisma);
    const orga = await creerUtilisateur(prisma, jwt);
    idCagnotte = (await creerCagnotte(prisma, orga.id_utilisateur)).id_cagnotte;
  });

  beforeEach(() => {
    notchPay.reinitialiser();
  });

  afterAll(async () => {
    await app.close();
  });

  // Crée un don EN_ATTENTE par l'API ; renvoie son identifiant et sa référence Notch Pay.
  async function creerDon(numero: string, montant = 5000) {
    const donateur = await creerUtilisateur(prisma, jwt);
    compteur += 1;
    const reponse = await request(app.getHttpServer())
      .post('/dons')
      .set(entete(donateur.jeton))
      .set('X-Forwarded-For', `10.2.0.${compteur}`)
      .send({
        id_cagnotte: idCagnotte,
        montant,
        methode_paiement: 'ORANGE_MONEY',
        numero_payeur: numero,
      });
    expect(reponse.status).toBe(201);
    const idDon = (reponse.body as { id_don: number }).id_don;
    const paiement = await prisma.paiement.findFirstOrThrow({
      where: { don: { id_don: idDon } },
    });
    return { idDon, reference: paiement.reference_fournisseur!, montant };
  }

  function evenement(type: string, reference: string, autres: object = {}) {
    compteur += 1;
    return {
      id: `evt_test_${compteur}`,
      type,
      created_at: new Date().toISOString(),
      data: { id: 'pay_1', reference, status: 'complete', ...autres },
    };
  }

  // Envoie le corps tel quel (texte), signé sauf indication contraire.
  function envoyer(corps: string, signature?: string | null) {
    const requete = request(app.getHttpServer())
      .post('/paiements/webhook/notchpay')
      .set('Content-Type', 'application/json');
    const valeur =
      signature === undefined ? signerCorps(corps, HASH) : signature;
    if (valeur !== null) void requete.set('x-notch-signature', valeur);
    return requete.send(corps);
  }

  const statutDon = async (idDon: number) =>
    (await prisma.don.findUniqueOrThrow({ where: { id_don: idDon } })).statut;
  const collecte = async () =>
    Number(
      (
        await prisma.cagnotte.findUniqueOrThrow({
          where: { id_cagnotte: idCagnotte },
        })
      ).montant_collecte,
    );

  it('signature valide : le paiement est reconsulté puis le don validé', async () => {
    const avant = await collecte();
    const don = await creerDon('690000000');
    notchPay.consultations = 0;

    const reponse = await envoyer(
      JSON.stringify(evenement('payment.complete', don.reference)),
    );
    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ recu: true, resultat: 'traite' });
    expect(notchPay.consultations).toBe(1); // statut relu par l'API
    expect(await statutDon(don.idDon)).toBe('VALIDE');
    expect(await collecte()).toBe(avant + don.montant);
  });

  it('la signature porte sur le corps brut, pas sur le JSON re-sérialisé', async () => {
    const don = await creerDon('690000000');
    // Mise en forme inhabituelle : JSON.stringify(JSON.parse(corps)) donnerait d'autres octets.
    const corps = `{\n  "id" : "evt_brut_1",\n  "type":"payment.complete",   "data": { "reference": "${don.reference}" }\n}`;
    expect(corps).not.toBe(JSON.stringify(JSON.parse(corps)));

    const reponse = await envoyer(corps);
    expect(reponse.status).toBe(200);
    expect(await statutDon(don.idDon)).toBe('VALIDE');

    // La signature du JSON re-sérialisé est refusée.
    const autre = await creerDon('690000000');
    const corps2 = corps
      .replace('evt_brut_1', 'evt_brut_2')
      .replace(don.reference, autre.reference);
    const refuse = await envoyer(
      corps2,
      signerCorps(JSON.stringify(JSON.parse(corps2)), HASH),
    );
    expect(refuse.status).toBe(403);
    expect(await statutDon(autre.idDon)).toBe('EN_ATTENTE');
  });

  it('signature invalide : 403, aucun traitement', async () => {
    const don = await creerDon('690000000');
    const avant = await prisma.webhookRecu.count();
    notchPay.consultations = 0;
    const corps = JSON.stringify(evenement('payment.complete', don.reference));

    for (const signature of [
      signerCorps(corps, 'autre-hash'),
      signerCorps(`${corps} `, HASH), // signature d'un autre corps
      'abc',
      'f'.repeat(64),
    ]) {
      expect((await envoyer(corps, signature)).status).toBe(403);
    }
    expect(await statutDon(don.idDon)).toBe('EN_ATTENTE');
    expect(notchPay.consultations).toBe(0);
    expect(await prisma.webhookRecu.count()).toBe(avant);
  });

  it('signature absente : 403, aucun traitement', async () => {
    const don = await creerDon('690000000');
    const corps = JSON.stringify(evenement('payment.complete', don.reference));
    expect((await envoyer(corps, null)).status).toBe(403);
    expect((await envoyer(corps, '')).status).toBe(403);
    expect(await statutDon(don.idDon)).toBe('EN_ATTENTE');
  });

  it('événement en double : 200 sans rien refaire', async () => {
    const avant = await collecte();
    const don = await creerDon('690000000', 2000);
    const corps = JSON.stringify(evenement('payment.complete', don.reference));

    expect((await envoyer(corps)).body).toMatchObject({ resultat: 'traite' });
    notchPay.consultations = 0;
    const double = await envoyer(corps);
    expect(double.status).toBe(200);
    expect(double.body).toMatchObject({ resultat: 'deja_traite' });
    expect(notchPay.consultations).toBe(0);

    expect(await collecte()).toBe(avant + 2000);
    expect(
      await prisma.transaction.count({
        where: { paiement: { don: { id_don: don.idDon } } },
      }),
    ).toBe(1);
  });

  it('deux événements différents pour le même paiement ne le comptent qu’une fois', async () => {
    const avant = await collecte();
    const don = await creerDon('690000000', 1500);
    const reponses = await Promise.all([
      envoyer(JSON.stringify(evenement('payment.complete', don.reference))),
      envoyer(JSON.stringify(evenement('payment.complete', don.reference))),
    ]);
    expect(reponses.map((r) => r.status)).toEqual([200, 200]);
    expect(await collecte()).toBe(avant + 1500);
  });

  it('montant incohérent : le don n’est pas validé', async () => {
    const avant = await collecte();
    const don = await creerDon('690000000', 5000);
    notchPay.montantRenvoye = 500; // l'API annonce 500 XAF pour un don de 5 000
    const reponse = await envoyer(
      JSON.stringify(
        evenement('payment.complete', don.reference, {
          amount: 5000,
          currency: 'XAF',
        }),
      ),
    );
    expect(reponse.status).toBe(200);
    expect(await statutDon(don.idDon)).toBe('ECHOUE');
    expect(
      (
        await prisma.paiement.findFirstOrThrow({
          where: { don: { id_don: don.idDon } },
        })
      ).code_erreur,
    ).toBe('MONTANT_INCOHERENT');
    expect(await collecte()).toBe(avant);
  });

  it('ne croit pas le corps sur parole : « complete » annoncé, échec réel', async () => {
    const avant = await collecte();
    const don = await creerDon('690000001'); // fonds insuffisants côté Notch Pay
    const reponse = await envoyer(
      JSON.stringify(evenement('payment.complete', don.reference)),
    );
    expect(reponse.status).toBe(200);
    expect(await statutDon(don.idDon)).toBe('ECHOUE');
    expect(await collecte()).toBe(avant);
  });

  it('payment.failed : le don échoue avec le code de Notch Pay', async () => {
    const don = await creerDon('690000001');
    await envoyer(
      JSON.stringify(
        evenement('payment.failed', don.reference, { status: 'failed' }),
      ),
    );
    expect(
      await prisma.paiement.findFirstOrThrow({
        where: { don: { id_don: don.idDon } },
      }),
    ).toMatchObject({ statut: 'ECHOUE', code_erreur: 'INSUFFICIENT_BALANCE' });
  });

  it('transaction inconnue : 200, rien ne change', async () => {
    const reponse = await envoyer(
      JSON.stringify(evenement('payment.complete', 'trx.inconnue')),
    );
    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ resultat: 'transaction_inconnue' });
  });

  // Les événements de versement sont testés dans retraits-notchpay.e2e-spec.ts.
  it('versement inconnu ou autre type d’événement : 200, rien ne change', async () => {
    const versement = await envoyer(
      JSON.stringify(evenement('transfer.complete', 'po.inconnu')),
    );
    expect(versement.status).toBe(200);
    expect(versement.body).toMatchObject({ resultat: 'transaction_inconnue' });

    const autre = await envoyer(
      JSON.stringify(evenement('customer.created', 'cus_1')),
    );
    expect(autre.status).toBe(200);
    expect(autre.body).toMatchObject({ resultat: 'ignore' });
  });

  it('erreur interne : 500, puis le nouvel envoi du même événement est traité', async () => {
    const don = await creerDon('690000000');
    const corps = JSON.stringify(evenement('payment.complete', don.reference));

    notchPay.erreurs.consulter = new ErreurReseauPaiement('injoignable');
    expect((await envoyer(corps)).status).toBe(500);
    expect(await statutDon(don.idDon)).toBe('EN_ATTENTE');

    const renvoi = await envoyer(corps);
    expect(renvoi.status).toBe(200);
    expect(renvoi.body).toMatchObject({ resultat: 'traite' });
    expect(await statutDon(don.idDon)).toBe('VALIDE');
  });
});
