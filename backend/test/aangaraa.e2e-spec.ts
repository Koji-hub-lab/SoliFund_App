import type { INestApplication } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { OperationAangaraa } from '../src/payment/aangaraa.client';
import {
  ErreurIntrouvablePaiement,
  ErreurPaiement,
  ErreurReseauPaiement,
  ErreurValidationPaiement,
} from '../src/payment/paiement.erreurs';
import type { MethodePaiement } from '../src/payment/notchpay.utilitaires';
import type { PrismaService } from '../src/prisma/prisma.service';

// AangaraaPay comme fournisseur actif (variables lues à l'import de l'application, plus bas).
process.env.PAIEMENT_FOURNISSEUR = 'aangaraa';
process.env.PUBLIC_API_URL = 'https://api.solifund.test';

// Faux client AangaraaPay (même méthodes que AangaraaPayClient) : aucun appel réseau. Chaque
// paiement est PENDING jusqu'à ce que le test fixe son statut réel (`statuts`).
class FauxAangaraa {
  readonly urlNotification = `https://api.solifund.test/paiements/webhook/aangaraa/${process.env.AANGARAA_WEBHOOK_JETON}`;
  paiements: {
    payToken: string;
    reference: string;
    numero: string;
    montant: number;
    methode: MethodePaiement;
  }[] = [];
  // Statut renvoyé par check_status, par payToken.
  statuts: Record<
    string,
    { status: string; reason?: string; amount?: number; phone?: string }
  > = {};
  versements: { referenceId: string; numero: string; montant: number }[] = [];
  // Appels à verser(), y compris ceux restés sans réponse (le versement est peut-être parti).
  appelsVerser = 0;
  // Erreur levée par le prochain appel à verser() (une seule fois).
  erreurVersement?: ErreurPaiement;
  // Statut renvoyé par check_withdrawal_status : par reference_id, sinon statutVersement.
  // NOT_FOUND (ou une référence inconnue) lève ErreurIntrouvablePaiement, comme le vrai client.
  statutVersement = 'PENDING';
  statutsVersement: Record<string, { status: string; reason?: string }> = {};
  solde = { total: 1_000_000, mtn: 1_000_000, orange: 1_000_000 };
  erreurPaiement?: ErreurPaiement;
  private compteur = 0;

  reinitialiser() {
    this.paiements = [];
    this.statuts = {};
    this.versements = [];
    this.appelsVerser = 0;
    this.erreurVersement = undefined;
    this.statutVersement = 'PENDING';
    this.statutsVersement = {};
    this.solde = { total: 1_000_000, mtn: 1_000_000, orange: 1_000_000 };
    this.erreurPaiement = undefined;
  }

  estConfigure() {
    return true;
  }

  payerDirect(p: {
    numero: string;
    montant: number;
    description: string;
    reference: string;
    methode: MethodePaiement;
  }): Promise<OperationAangaraa> {
    if (this.erreurPaiement) {
      const erreur = this.erreurPaiement;
      this.erreurPaiement = undefined;
      return Promise.reject(erreur);
    }
    this.compteur += 1;
    const payToken = `tok-${this.compteur}`;
    this.paiements.push({ payToken, ...p });
    return Promise.resolve({
      reference: payToken,
      statut: 'PENDING',
      brut: {},
    });
  }

  consulterPaiement(payToken: string): Promise<OperationAangaraa> {
    const paiement = this.paiements.find((p) => p.payToken === payToken);
    const reel = this.statuts[payToken] ?? { status: 'PENDING' };
    return Promise.resolve({
      reference: payToken,
      statut: reel.status,
      montant: reel.amount ?? paiement?.montant,
      devise: 'XAF',
      telephone: reel.phone ?? paiement?.numero.replace('+', ''),
      raison: reel.reason,
      brut: {},
    });
  }

  verser(v: {
    numero: string;
    montant: number;
    methode: MethodePaiement;
  }): Promise<OperationAangaraa> {
    this.appelsVerser += 1;
    if (this.erreurVersement) {
      const erreur = this.erreurVersement;
      this.erreurVersement = undefined;
      return Promise.reject(erreur);
    }
    this.compteur += 1;
    const referenceId = `ref-${this.compteur}`;
    this.versements.push({ referenceId, numero: v.numero, montant: v.montant });
    return Promise.resolve({
      reference: referenceId,
      statut: 'PENDING',
      montant: v.montant,
      devise: 'XAF',
      brut: {},
    });
  }

  consulterVersement(referenceId: string): Promise<OperationAangaraa> {
    const versement = this.versements.find(
      (v) => v.referenceId === referenceId,
    );
    const reel = this.statutsVersement[referenceId] ?? {
      status: this.statutVersement,
    };
    if (!versement || reel.status === 'NOT_FOUND') {
      return Promise.reject(
        new ErreurIntrouvablePaiement('Transaction not found', {
          code: 'NOT_FOUND',
        }),
      );
    }
    return Promise.resolve({
      reference: referenceId,
      statut: reel.status,
      montant: versement.montant,
      devise: 'XAF',
      raison: reel.reason,
      brut: {},
    });
  }

  lireSolde() {
    return Promise.resolve({
      solde: this.solde.total,
      parOperateur: {
        MTN_MOBILE_MONEY: this.solde.mtn,
        ORANGE_MONEY: this.solde.orange,
      },
      devise: 'XAF',
      brut: {},
    });
  }
}

type Outils = typeof import('./outils');
type Utilisateur = Awaited<ReturnType<Outils['creerUtilisateur']>>;

describe('AangaraaPay comme fournisseur actif (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let outils: Outils;
  let reconcilier: () => Promise<unknown>;
  const aangaraa = new FauxAangaraa();
  let idCagnotte: number;
  let adresse = 0;

  beforeAll(async () => {
    // Import après le choix du fournisseur ci-dessus.
    outils = await import('./outils.js');
    ({ app, prisma, jwt } = await outils.creerApplication({ aangaraa }));
    await outils.viderBase(prisma);
    const { ReconciliationDonsService } =
      await import('../src/dons/reconciliation-dons.service.js');
    const reconciliation = app.get(ReconciliationDonsService);
    reconcilier = () => reconciliation.reconcilier();
    const orga = await outils.creerUtilisateur(prisma, jwt);
    idCagnotte = (await outils.creerCagnotte(prisma, orga.id_utilisateur))
      .id_cagnotte;
  });

  beforeEach(() => {
    aangaraa.reinitialiser();
  });

  afterAll(async () => {
    await app.close();
  });

  async function donner(numero = '677123456', montant = 5000) {
    const donateur = await outils.creerUtilisateur(prisma, jwt);
    adresse += 1;
    const reponse = await request(app.getHttpServer())
      .post('/dons')
      .set(outils.entete(donateur.jeton))
      .set('X-Forwarded-For', `10.3.0.${adresse}`)
      .send({
        id_cagnotte: idCagnotte,
        montant,
        methode_paiement: 'MTN_MOBILE_MONEY',
        numero_payeur: numero,
      });
    expect(reponse.status).toBe(201);
    const don = reponse.body as {
      id_don: number;
      statut: string;
      demande_envoyee: boolean;
      message?: string;
    };
    return { don, donateur };
  }

  const paiementDe = (idDon: number) =>
    prisma.paiement.findFirstOrThrow({ where: { don: { id_don: idDon } } });

  // Notification d'AangaraaPay (non signée), sur l'adresse à jeton secret de notify_url.
  const JETON = process.env.AANGARAA_WEBHOOK_JETON!;
  const notifier = (corps: object, jeton: string | null = JETON) =>
    request(app.getHttpServer())
      .post(`/paiements/webhook/aangaraa${jeton === null ? '' : `/${jeton}`}`)
      .set('X-Forwarded-For', '10.9.9.9')
      .send(corps);

  // Vérification du statut par le donateur (bouton et vérification automatique du formulaire).
  const verifier = async (idDon: number, donateur: Utilisateur) => {
    const reponse = await request(app.getHttpServer())
      .post(`/dons/${idDon}/verifier-statut`)
      .set(outils.entete(donateur.jeton));
    expect(reponse.status).toBe(201);
    return reponse.body as {
      statut: string;
      code_erreur?: string;
      message?: string;
      peut_reessayer?: boolean;
    };
  };

  const vieillir = (idDon: number, minutes: number) =>
    prisma.don.update({
      where: { id_don: idDon },
      data: { date_creation: new Date(Date.now() - minutes * 60_000) },
    });

  it('crée le paiement chez AangaraaPay, avec notre référence et l’opérateur, et garde le payToken', async () => {
    const { don } = await donner('677123456', 3000);
    expect(don).toMatchObject({ statut: 'EN_ATTENTE', demande_envoyee: true });
    expect(aangaraa.paiements[0]).toMatchObject({
      reference: `SOLIFUND-DON-${don.id_don}`,
      numero: '+237677123456',
      montant: 3000,
      methode: 'MTN_MOBILE_MONEY',
    });
    expect(await paiementDe(don.id_don)).toMatchObject({
      fournisseur: 'AANGARAA',
      reference_fournisseur: 'tok-1',
      canal: 'MTN_Cameroon',
      statut_operateur: 'PENDING',
    });
  });

  it('webhook : le statut est reconsulté puis appliqué (le corps n’est jamais cru)', async () => {
    const { don } = await donner();
    const { payToken } = aangaraa.paiements[0];

    // La notification annonce SUCCESSFUL, mais l'API répond FAILED : le don échoue.
    aangaraa.statuts[payToken] = {
      status: 'FAILED',
      reason: 'Solde insuffisant',
    };
    const reponse = await notifier({
      transaction_id: `SOLIFUND-DON-${don.id_don}`,
      status: 'SUCCESSFUL',
      amount: 5000,
      paytoken: payToken,
    });
    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ resultat: 'traite' });
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'INSUFFICIENT_BALANCE',
      statut_operateur: 'FAILED',
      raison_operateur: 'Solde insuffisant',
    });
  });

  it('webhook : paiement réussi chez AangaraaPay → don validé, une seule fois', async () => {
    const { don } = await donner('677123456', 2000);
    const { payToken } = aangaraa.paiements[0];
    aangaraa.statuts[payToken] = { status: 'SUCCESSFUL' };
    const corps = {
      transaction_id: `SOLIFUND-DON-${don.id_don}`,
      status: 'SUCCESSFUL',
      paytoken: payToken,
    };
    expect((await notifier(corps)).body).toMatchObject({ resultat: 'traite' });
    expect((await notifier(corps)).body).toMatchObject({
      resultat: 'deja_traite',
    });
    expect((await paiementDe(don.id_don)).statut).toBe('VALIDE');
    expect(
      await prisma.transaction.count({
        where: { paiement: { don: { id_don: don.id_don } } },
      }),
    ).toBe(1);
  });

  it('ne valide pas un paiement réussi pour un autre numéro ou un autre montant', async () => {
    const autreNumero = await donner('677123456');
    aangaraa.statuts[aangaraa.paiements[0].payToken] = {
      status: 'SUCCESSFUL',
      phone: '237699000000',
    };
    await notifier({
      transaction_id: `SOLIFUND-DON-${autreNumero.don.id_don}`,
    });
    expect(await paiementDe(autreNumero.don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'PAYEUR_INCOHERENT',
    });

    aangaraa.reinitialiser();
    const autreMontant = await donner('677123456', 5000);
    aangaraa.statuts[aangaraa.paiements[0].payToken] = {
      status: 'SUCCESSFUL',
      amount: 50,
    };
    await notifier({
      transaction_id: `SOLIFUND-DON-${autreMontant.don.id_don}`,
    });
    expect(await paiementDe(autreMontant.don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'MONTANT_INCOHERENT',
    });
  });

  it('transaction inconnue : 200 sans effet', async () => {
    const reponse = await notifier({ transaction_id: 'SOLIFUND-DON-999999' });
    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ resultat: 'transaction_inconnue' });
  });

  it('webhook avec un jeton absent ou incorrect : 403, rien n’est consulté ni appliqué', async () => {
    const { don } = await donner();
    const { payToken } = aangaraa.paiements[0];
    aangaraa.statuts[payToken] = { status: 'SUCCESSFUL' };
    const corps = {
      transaction_id: `SOLIFUND-DON-${don.id_don}`,
      status: 'SUCCESSFUL',
    };
    for (const jeton of [
      null,
      'mauvais-jeton',
      `${JETON}x`,
      JETON.slice(0, -1),
    ]) {
      expect((await notifier(corps, jeton)).status).toBe(403);
    }
    expect((await paiementDe(don.id_don)).statut).toBe('EN_ATTENTE');
    expect(
      await prisma.webhookRecu.count({
        where: { reference: `SOLIFUND-DON-${don.id_don}` },
      }),
    ).toBe(0);
  });

  it('vérification par le donateur : échec avec la raison de l’opérateur, en message clair', async () => {
    const { don, donateur } = await donner();
    expect((await verifier(don.id_don, donateur)).statut).toBe('EN_ATTENTE');

    aangaraa.statuts[aangaraa.paiements[0].payToken] = {
      status: 'CANCELLED',
      reason: 'Transaction annulée par le client',
    };
    expect(await verifier(don.id_don, donateur)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'CANCELLED_BY_USER',
      peut_reessayer: true,
      message:
        'Vous avez annulé le paiement sur votre téléphone. Vous pouvez réessayer quand vous le souhaitez.',
    });
  });

  it('paiement refusé par MTN (LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED) : message dédié, raison brute enregistrée', async () => {
    const { don, donateur } = await donner();
    aangaraa.statuts[aangaraa.paiements[0].payToken] = {
      status: 'FAILED',
      reason: 'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED',
    };
    expect(await verifier(don.id_don, donateur)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED',
      peut_reessayer: true,
      message:
        'Le paiement a été refusé par MTN Mobile Money. Vérifiez que votre solde est suffisant et que votre compte est autorisé à payer chez un marchand, puis réessayez ou utilisez un autre numéro.',
    });
    expect(await paiementDe(don.id_don)).toMatchObject({
      message_erreur: 'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED',
    });
  });

  it('raison inconnue : message générique, raison brute enregistrée', async () => {
    const { don, donateur } = await donner();
    aangaraa.statuts[aangaraa.paiements[0].payToken] = {
      status: 'FAILED',
      reason: 'SOME_NEW_OPERATOR_REASON',
    };
    const resultat = await verifier(don.id_don, donateur);
    expect(resultat).toMatchObject({
      statut: 'ECHOUE',
      message:
        "Le paiement n'a pas abouti. Aucun montant n'a été débité. Veuillez réessayer.",
    });
    expect(await paiementDe(don.id_don)).toMatchObject({
      message_erreur: 'SOME_NEW_OPERATOR_REASON',
    });
  });

  it('vérification par le donateur : succès → don validé', async () => {
    const { don, donateur } = await donner('677123456', 4200);
    aangaraa.statuts[aangaraa.paiements[0].payToken] = { status: 'SUCCESSFUL' };
    expect((await verifier(don.id_don, donateur)).statut).toBe('VALIDE');
  });

  it('réponse sans payToken : don en ECHOUE avec la raison renvoyée', async () => {
    // Ce que lève le client quand la réponse ne contient pas de payToken.
    aangaraa.erreurPaiement = new ErreurValidationPaiement(
      'Numéro non enregistré chez l’opérateur',
      { code: 'FAILED' },
    );
    const { don } = await donner();
    expect(don).toMatchObject({ statut: 'ECHOUE', demande_envoyee: false });
    expect(don.message).toContain("n'a pas de compte Mobile Money");
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'UNREGISTERED_PHONE',
      message_erreur: 'Numéro non enregistré chez l’opérateur',
    });
  });

  it('sans réponse à l’initiation : EN_ATTENTE, et le payToken d’une notification n’est jamais utilisé', async () => {
    aangaraa.erreurPaiement = new ErreurReseauPaiement('injoignable');
    const { don } = await donner('677123456', 1500);
    expect(don).toMatchObject({
      statut: 'INDISPONIBLE',
      demande_envoyee: false,
    });
    expect(don.message).toContain('ne la validez pas');

    // Une notification apporte un payToken « réussi » : il n'est pas enregistré, rien n'est validé
    // (seul le payToken enregistré à la création sert à consulter AangaraaPay).
    aangaraa.paiements.push({
      payToken: 'tok-du-corps',
      reference: `SOLIFUND-DON-${don.id_don}`,
      numero: '+237677123456',
      montant: 1500,
      methode: 'MTN_MOBILE_MONEY',
    });
    aangaraa.statuts['tok-du-corps'] = { status: 'SUCCESSFUL' };
    const reponse = await notifier({
      transaction_id: `SOLIFUND-DON-${don.id_don}`,
      status: 'SUCCESSFUL',
      paytoken: 'tok-du-corps',
    });
    expect(reponse.status).toBe(200);
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'EN_ATTENTE',
      reference_fournisseur: null,
    });

    // Sans payToken, la réconciliation l'abandonne après 30 minutes.
    await vieillir(don.id_don, 35);
    await reconcilier();
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'TIMEOUT',
    });
  });

  it('réconciliation : pas d’annulation possible, on attend le statut final (24 h au plus)', async () => {
    const { don } = await donner();
    await vieillir(don.id_don, 45);
    await reconcilier();
    expect((await paiementDe(don.id_don)).statut).toBe('EN_ATTENTE');

    await vieillir(don.id_don, 25 * 60);
    await reconcilier();
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'TIMEOUT',
    });
  });

  it('paiement confirmé après un abandon faute de réponse : le don est validé quand même', async () => {
    const { don } = await donner('677123456', 1200);
    await vieillir(don.id_don, 25 * 60);
    await reconcilier();
    expect((await paiementDe(don.id_don)).statut).toBe('ECHOUE');

    // AangaraaPay confirme finalement le paiement (vérifié avec le payToken enregistré).
    aangaraa.statuts[aangaraa.paiements[0].payToken] = { status: 'SUCCESSFUL' };
    await notifier({
      transaction_id: `SOLIFUND-DON-${don.id_don}`,
      status: 'SUCCESSFUL',
    });
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'VALIDE',
      code_erreur: null,
    });
  });

  describe('versements', () => {
    let admin: Utilisateur;

    beforeAll(async () => {
      admin = await outils.creerUtilisateur(prisma, jwt, { admin: true });
    });

    async function demandeRetrait() {
      const orga = await outils.creerUtilisateur(prisma, jwt);
      // Numéro de retrait Orange (validerIdentite : opérateur Orange Money).
      await outils.validerIdentite(prisma, orga.id_utilisateur, '690000000');
      const cagnotte = await outils.creerCagnotte(prisma, orga.id_utilisateur, {
        montant_collecte: 100000,
      });
      const reponse = await request(app.getHttpServer())
        .post('/retraits')
        .set(outils.entete(orga.jeton))
        .send({ id_cagnotte: cagnotte.id_cagnotte, montant: 10000 });
      expect(reponse.status).toBe(201);
      return (reponse.body as { id_retrait: number }).id_retrait;
    }

    const verser = (id: number) =>
      request(app.getHttpServer())
        .post(`/retraits/${id}/verser`)
        .set(outils.entete(admin.jeton));

    const retrait = (id: number) =>
      prisma.retrait.findUniqueOrThrow({ where: { id_retrait: id } });

    // Réconciliation des versements, comme la tâche planifiée, après plus de 5 minutes.
    async function reconcilierVersements(id: number) {
      await prisma.retrait.update({
        where: { id_retrait: id },
        data: { date_validation: new Date(Date.now() - 6 * 60_000) },
      });
      const { RetraitsService } =
        await import('../src/retraits/retraits.service.js');
      await app.get(RetraitsService).reconcilierVersements();
      return retrait(id);
    }

    // Notifications reçues par un utilisateur pour ce retrait (paramètre « retrait » des alertes).
    const notifications = (idUtilisateur: number, code: string) =>
      prisma.recevoir.count({
        where: { id_utilisateur: idUtilisateur, notification: { code } },
      });
    const alertes = (code: string, id: number) =>
      prisma.recevoir.count({
        where: {
          id_utilisateur: admin.id_utilisateur,
          notification: { code, parametres: { path: ['retrait'], equals: id } },
        },
      });

    it('solde Orange insuffisant : rien n’est envoyé, l’admin voit les soldes MTN et Orange', async () => {
      const id = await demandeRetrait();
      aangaraa.solde = { total: 1_000_000, mtn: 995_000, orange: 5000 };
      const reponse = await verser(id);
      expect(reponse.status).toBe(400);
      const message = (reponse.body as { message: string }).message;
      expect(message).toContain(
        'Le solde Orange du compte AangaraaPay est insuffisant',
      );
      expect(message).toMatch(
        /Soldes disponibles : MTN 995\s000 XAF, Orange 5\s000 XAF/,
      );
      expect(aangaraa.appelsVerser).toBe(0);
      expect((await retrait(id)).statut).toBe('EN_ATTENTE');
    });

    it('succès : verse le net une fois, garde le reference_id, puis TRAITE avec commission et notification', async () => {
      const id = await demandeRetrait();
      expect((await verser(id)).status).toBe(201);
      expect(aangaraa.versements).toEqual([
        expect.objectContaining({ numero: '+237690000000', montant: 9700 }),
      ]);
      const approuve = await retrait(id);
      expect(approuve).toMatchObject({
        statut: 'APPROUVE',
        fournisseur: 'AANGARAA',
        reference_fournisseur: aangaraa.versements[0].referenceId,
      });

      aangaraa.statutVersement = 'SUCCESSFUL';
      expect((await reconcilierVersements(id)).statut).toBe('TRAITE');
      expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
        1,
      );
      expect(
        await notifications(approuve.id_utilisateur, 'RETRAIT_TRAITE'),
      ).toBe(1);
      expect(aangaraa.appelsVerser).toBe(1);
    });

    it('échec : ECHOUE avec la raison, puis relance après confirmation de l’échec', async () => {
      const id = await demandeRetrait();
      expect((await verser(id)).status).toBe(201);
      const premier = aangaraa.versements[0].referenceId;
      aangaraa.statutsVersement[premier] = {
        status: 'FAILED',
        reason: 'Numéro du bénéficiaire invalide',
      };
      const echoue = await reconcilierVersements(id);
      expect(echoue).toMatchObject({
        statut: 'ECHOUE',
        message_erreur: 'Numéro du bénéficiaire invalide',
      });
      expect(await notifications(echoue.id_utilisateur, 'RETRAIT_ECHOUE')).toBe(
        1,
      );

      // Relance : le premier versement est reconsulté (toujours FAILED), puis un seul nouvel envoi.
      expect((await verser(id)).status).toBe(201);
      expect(aangaraa.appelsVerser).toBe(2);
      const second = aangaraa.versements[1].referenceId;
      expect(await retrait(id)).toMatchObject({
        statut: 'APPROUVE',
        reference_retrait: `SOLIFUND-RET-${id}-2`,
        reference_fournisseur: second,
        tentatives_versement: 2,
      });
      aangaraa.statutsVersement[second] = { status: 'SUCCESSFUL' };
      expect((await reconcilierVersements(id)).statut).toBe('TRAITE');
      expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
        1,
      );
    });

    it('relance refusée si le versement précédent n’est pas confirmé FAILED', async () => {
      const id = await demandeRetrait();
      expect((await verser(id)).status).toBe(201);
      const premier = aangaraa.versements[0].referenceId;
      aangaraa.statutsVersement[premier] = { status: 'FAILED' };
      expect((await reconcilierVersements(id)).statut).toBe('ECHOUE');

      // Le fournisseur le dit maintenant en cours : rien n'est renvoyé.
      aangaraa.statutsVersement[premier] = { status: 'PENDING' };
      const enCours = await verser(id);
      expect(enCours.status).toBe(409);
      expect((enCours.body as { message: string }).message).toContain(
        'toujours en cours',
      );

      // Il a finalement abouti : le retrait est versé, sans second envoi.
      aangaraa.statutsVersement[premier] = { status: 'SUCCESSFUL' };
      const reussi = await verser(id);
      expect(reussi.status).toBe(409);
      expect((reussi.body as { message: string }).message).toContain(
        'a finalement abouti',
      );
      expect(aangaraa.appelsVerser).toBe(1);
      expect((await retrait(id)).statut).toBe('TRAITE');
      expect(await prisma.commission.count({ where: { id_retrait: id } })).toBe(
        1,
      );
    });

    it('timeout : le retrait reste APPROUVE, l’admin est alerté, et rien n’est jamais renvoyé', async () => {
      const id = await demandeRetrait();
      aangaraa.erreurVersement = new ErreurReseauPaiement(
        'Délai de 60 s dépassé',
      );
      const reponse = await verser(id);
      expect(reponse.status).toBe(503);
      expect(await retrait(id)).toMatchObject({
        statut: 'APPROUVE',
        reference_fournisseur: null,
      });
      expect(await alertes('VERSEMENT_INCERTAIN', id)).toBe(1);

      // Un nouveau clic est refusé, et la réconciliation consulte sans renvoyer (NOT_FOUND : la
      // référence n'est pas connue d'AangaraaPay), sans nouvelle alerte.
      expect((await verser(id)).status).toBe(400);
      expect((await reconcilierVersements(id)).statut).toBe('APPROUVE');
      expect((await reconcilierVersements(id)).statut).toBe('APPROUVE');
      expect(aangaraa.appelsVerser).toBe(1);
      expect(await alertes('VERSEMENT_INCERTAIN', id)).toBe(1);
      expect(await alertes('VERSEMENT_INTROUVABLE', id)).toBe(0);
    });

    it('NOT_FOUND : alerte admin une seule fois, aucune action automatique', async () => {
      const id = await demandeRetrait();
      expect((await verser(id)).status).toBe(201);
      aangaraa.statutsVersement[aangaraa.versements[0].referenceId] = {
        status: 'NOT_FOUND',
      };
      expect((await reconcilierVersements(id)).statut).toBe('APPROUVE');
      expect((await reconcilierVersements(id)).statut).toBe('APPROUVE');
      expect(await alertes('VERSEMENT_INTROUVABLE', id)).toBe(1);
      expect(aangaraa.appelsVerser).toBe(1);
    });
  });
});
