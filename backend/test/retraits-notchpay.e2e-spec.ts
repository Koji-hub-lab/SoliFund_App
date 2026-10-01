import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ErreurReseauPaiement,
  ErreurValidationPaiement,
} from '../src/payment/paiement.erreurs';
import { signerCorps } from '../src/payment/notchpay.signature';
import { PrismaService } from '../src/prisma/prisma.service';
import { RetraitsService } from '../src/retraits/retraits.service';
import { FauxNotchPay } from './faux-notchpay';
import {
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  validerIdentite,
  viderBase,
} from './outils';

type Utilisateur = Awaited<ReturnType<typeof creerUtilisateur>>;
const HASH = 'hsk_test_factice'; // test/environnement.ts

// Retraits versés par Notch Pay, avec le faux client des tests : le dernier chiffre du numéro de
// retrait décide du résultat du versement (0 réussi, 2 échoué, autre : en cours).
describe('Retraits versés par Notch Pay (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let notchPay: FauxNotchPay;
  let retraits: RetraitsService;
  let admin: Utilisateur;
  let evenements = 0;

  beforeAll(async () => {
    ({ app, prisma, jwt, notchPay } = await creerApplication());
    await viderBase(prisma);
    retraits = app.get(RetraitsService);
    admin = await creerUtilisateur(prisma, jwt, { admin: true });
  });

  beforeEach(() => {
    notchPay.reinitialiser();
  });

  afterAll(async () => {
    await app.close();
  });

  // Organisateur vérifié (numéro de retrait choisi), cagnotte de 100 000 XAF et retrait demandé.
  async function demande(numero: string, montant = 10000) {
    const orga = await creerUtilisateur(prisma, jwt);
    await validerIdentite(prisma, orga.id_utilisateur, numero);
    const cagnotte = await creerCagnotte(prisma, orga.id_utilisateur, {
      montant_collecte: 100000,
    });
    const reponse = await request(app.getHttpServer())
      .post('/retraits')
      .set(entete(orga.jeton))
      .send({ id_cagnotte: cagnotte.id_cagnotte, montant });
    expect(reponse.status).toBe(201);
    const id = (reponse.body as { id_retrait: number }).id_retrait;
    return { id, orga, cagnotte };
  }

  const admin_post = (chemin: string, corps?: object) =>
    request(app.getHttpServer())
      .post(chemin)
      .set(entete(admin.jeton))
      .send(corps);
  const verser = (id: number) => admin_post(`/retraits/${id}/verser`);
  const message = (reponse: request.Response) =>
    (reponse.body as { message: string }).message;
  const retrait = (id: number) =>
    prisma.retrait.findUniqueOrThrow({ where: { id_retrait: id } });

  function webhook(type: string, reference: string) {
    evenements += 1;
    const corps = JSON.stringify({
      id: `evt_retrait_${evenements}`,
      type,
      data: { reference, status: 'complete' },
    });
    return request(app.getHttpServer())
      .post('/paiements/webhook/notchpay')
      .set('Content-Type', 'application/json')
      .set('x-notch-signature', signerCorps(corps, HASH))
      .send(corps);
  }

  // Vieillit le versement pour la réconciliation (plus de 5 minutes).
  const vieillir = (id: number) =>
    prisma.retrait.update({
      where: { id_retrait: id },
      data: { date_validation: new Date(Date.now() - 6 * 60_000) },
    });

  const notifications = (idUtilisateur: number, code: string) =>
    prisma.recevoir.count({
      where: { id_utilisateur: idUtilisateur, notification: { code } },
    });

  it('versement réussi : approuvé, versé par Notch Pay, puis traité à la confirmation', async () => {
    const { id, orga, cagnotte } = await demande('690000000');

    const reponse = await verser(id);
    expect(reponse.status).toBe(201);
    expect(await retrait(id)).toMatchObject({
      statut: 'APPROUVE',
      reference_retrait: `SOLIFUND-RET-${id}`,
      reference_fournisseur: notchPay.versements[0].reference,
      tentatives_versement: 1,
      traite_par: admin.id_utilisateur,
    });
    // Le net (10 000 - 3 %) est versé sur le numéro vérifié, par le canal de son opérateur.
    expect(notchPay.versements[0].nouveau).toMatchObject({
      montant: 9700,
      devise: 'XAF',
      reference: `SOLIFUND-RET-${id}`,
      canal: 'cm.orange',
      beneficiaire: {
        nom: `${orga.prenom} ${orga.nom}`,
        telephone: '+237690000000',
      },
    });
    // Rien n'est enregistré avant la confirmation du versement.
    expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
      0,
    );
    expect(await notifications(orga.id_utilisateur, 'RETRAIT_TRAITE')).toBe(0);

    // Webhook de versement réussi : le versement est reconsulté, puis le retrait traité.
    notchPay.consultations = 0;
    const evenement = await webhook(
      'transfer.complete',
      notchPay.versements[0].reference,
    );
    expect(evenement.status).toBe(200);
    expect(notchPay.consultations).toBe(1);
    expect((await retrait(id)).statut).toBe('TRAITE');
    expect(
      await prisma.commission.findUniqueOrThrow({ where: { id_retrait: id } }),
    ).toMatchObject({ id_cagnotte: cagnotte.id_cagnotte });
    const transaction = await prisma.transaction.findFirstOrThrow({
      where: { id_retrait: id },
    });
    expect(Number(transaction.montant)).toBe(9700);
    expect(await notifications(orga.id_utilisateur, 'RETRAIT_TRAITE')).toBe(1);

    // Un second événement ou la réconciliation ne refont rien.
    await webhook('transfer.complete', notchPay.versements[0].reference);
    await retraits.reconcilierVersements();
    expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
      1,
    );
    expect(await notifications(orga.id_utilisateur, 'RETRAIT_TRAITE')).toBe(1);
  });

  it('un double clic ne lance qu’un seul versement', async () => {
    const { id } = await demande('690000000');
    const reponses = await Promise.all([verser(id), verser(id), verser(id)]);
    expect(reponses.map((r) => r.status).sort()).toEqual([201, 400, 400]);
    expect(notchPay.versements).toHaveLength(1);
  });

  it('échec puis relance : ECHOUE, plus engagé, puis nouveau versement avec une référence suffixée', async () => {
    const { id, orga, cagnotte } = await demande('690000002', 40000);
    expect((await verser(id)).status).toBe(201);
    expect((await retrait(id)).statut).toBe('APPROUVE');

    // Pas de réconciliation avant 5 minutes.
    expect(await retraits.reconcilierVersements()).toMatchObject({
      consultes: 0,
    });
    await vieillir(id);
    expect(await retraits.reconcilierVersements()).toMatchObject({
      consultes: 1,
      echoues: 1,
    });
    expect(await retrait(id)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'PROVIDER_ERROR',
    });
    expect(await notifications(orga.id_utilisateur, 'RETRAIT_ECHOUE')).toBe(1);
    expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
      0,
    );

    // Un retrait échoué ne compte plus dans le montant engagé : les 100 000 XAF sont disponibles.
    const autre = await request(app.getHttpServer())
      .post('/retraits')
      .set(entete(orga.jeton))
      .send({ id_cagnotte: cagnotte.id_cagnotte, montant: 70000 });
    expect(autre.status).toBe(201);

    // La relance est refusée si la somme n'est plus disponible (70 000 engagés + 40 000 > 100 000).
    const refusee = await verser(id);
    expect(refusee.status).toBe(400);
    expect(message(refusee)).toContain('Montant disponible insuffisant');
    expect((await retrait(id)).statut).toBe('ECHOUE');

    // Une fois l'autre retrait rejeté, la relance part avec une nouvelle référence.
    const idAutre = (autre.body as { id_retrait: number }).id_retrait;
    expect(
      (
        await admin_post(`/retraits/${idAutre}/rejeter`, {
          motif_rejet: 'Test',
        })
      ).status,
    ).toBe(201);
    // Cette fois, le versement aboutit (le premier reste « failed » : la relance est autorisée).
    notchPay.statutsVersement[`SOLIFUND-RET-${id}-2`] = 'complete';
    expect((await verser(id)).status).toBe(201);
    expect(await retrait(id)).toMatchObject({
      statut: 'APPROUVE',
      reference_retrait: `SOLIFUND-RET-${id}-2`,
      tentatives_versement: 2,
      code_erreur: null,
    });
    expect(notchPay.versements).toHaveLength(2);
    expect(notchPay.versements[1].nouveau.reference).toBe(
      `SOLIFUND-RET-${id}-2`,
    );

    await webhook('transfer.complete', `SOLIFUND-RET-${id}-2`);
    expect((await retrait(id)).statut).toBe('TRAITE');
    expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
      1,
    );
  });

  it('un retrait dont le versement a échoué peut être rejeté', async () => {
    const { id } = await demande('690000002');
    await verser(id);
    await webhook('transfer.failed', `SOLIFUND-RET-${id}`);
    expect((await retrait(id)).statut).toBe('ECHOUE');
    expect(
      (
        await admin_post(`/retraits/${id}/rejeter`, {
          motif_rejet: 'Numéro fermé',
        })
      ).status,
    ).toBe(201);
    expect((await retrait(id)).statut).toBe('REJETE');
  });

  it('solde Notch Pay insuffisant : erreur claire, aucun versement, retrait inchangé', async () => {
    const { id } = await demande('690000000');
    notchPay.solde = 5000; // 9 700 XAF à verser
    const reponse = await verser(id);
    expect(reponse.status).toBe(400);
    expect(message(reponse)).toContain(
      'Le solde du compte Notch Pay est insuffisant',
    );
    expect(message(reponse)).toMatch(/5.000 XAF disponibles pour 9.700 XAF/);
    expect(notchPay.versements).toHaveLength(0);
    expect(await retrait(id)).toMatchObject({
      statut: 'EN_ATTENTE',
      tentatives_versement: 0,
    });
  });

  it('refus définitif de Notch Pay : le retrait passe en ECHOUE et peut être relancé', async () => {
    const { id, orga } = await demande('690000000');
    notchPay.erreurs.verser = new ErreurValidationPaiement(
      'Invalid beneficiary phone number.',
      { statutHttp: 422, code: '422' },
    );
    const reponse = await verser(id);
    expect(reponse.status).toBe(400);
    expect(message(reponse)).toContain('Invalid beneficiary phone number.');
    expect(await retrait(id)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: '422',
    });
    // L'organisateur n'est pas alerté pour un refus que l'administrateur voit tout de suite.
    expect(await notifications(orga.id_utilisateur, 'RETRAIT_ECHOUE')).toBe(0);
    expect((await verser(id)).status).toBe(201);
  });

  it('Notch Pay ne répond pas : le retrait reste APPROUVE et ne peut pas être relancé', async () => {
    const { id } = await demande('690000000');
    notchPay.erreurs.verser = new ErreurReseauPaiement('injoignable');
    const reponse = await verser(id);
    expect(reponse.status).toBe(503);
    expect(message(reponse)).toContain('le versement est peut-être parti');
    expect(await retrait(id)).toMatchObject({
      statut: 'APPROUVE',
      reference_fournisseur: null,
    });
    // Jamais de second versement tant que l'issue du premier est inconnue.
    expect((await verser(id)).status).toBe(400);
    await vieillir(id);
    await retraits.reconcilierVersements();
    expect((await retrait(id)).statut).toBe('APPROUVE');
    expect(notchPay.versements).toHaveLength(0);
  });

  it('mode manuel : marqué TRAITE hors plateforme, sans appel à Notch Pay', async () => {
    const { id, orga } = await demande('690000000');

    // La confirmation « hors plateforme » est obligatoire.
    expect((await admin_post(`/retraits/${id}/traiter`)).status).toBe(400);
    expect(
      (await admin_post(`/retraits/${id}/traiter`, { hors_plateforme: false }))
        .status,
    ).toBe(400);
    expect((await retrait(id)).statut).toBe('EN_ATTENTE');

    const reponse = await admin_post(`/retraits/${id}/traiter`, {
      hors_plateforme: true,
    });
    expect(reponse.status).toBe(201);
    expect(await retrait(id)).toMatchObject({
      statut: 'TRAITE',
      hors_plateforme: true,
      traite_par: admin.id_utilisateur,
      reference_fournisseur: null,
    });
    expect(notchPay.versements).toHaveLength(0);
    expect(notchPay.soldesLus).toBe(0);
    expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
      1,
    );
    expect(await notifications(orga.id_utilisateur, 'RETRAIT_TRAITE')).toBe(1);

    // Pas de mode manuel pendant qu'un versement Notch Pay est en cours.
    const enCours = await demande('690000003');
    await verser(enCours.id);
    expect(
      (
        await admin_post(`/retraits/${enCours.id}/traiter`, {
          hors_plateforme: true,
        })
      ).status,
    ).toBe(400);
  });

  it('réserve le versement aux administrateurs', async () => {
    const { id, orga } = await demande('690000000');
    const reponse = await request(app.getHttpServer())
      .post(`/retraits/${id}/verser`)
      .set(entete(orga.jeton));
    expect(reponse.status).toBe(403);
    expect(notchPay.versements).toHaveLength(0);
  });
});
