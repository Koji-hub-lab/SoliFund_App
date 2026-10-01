import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReconciliationDonsService } from '../src/dons/reconciliation-dons.service';
import {
  ErreurReseauPaiement,
  ErreurServeurPaiement,
  ErreurValidationPaiement,
} from '../src/payment/paiement.erreurs';
import { PrismaService } from '../src/prisma/prisma.service';
import { FauxNotchPay } from './faux-notchpay';
import {
  creerApplication,
  creerCagnotte,
  creerUtilisateur,
  entete,
  viderBase,
} from './outils';

type Utilisateur = Awaited<ReturnType<typeof creerUtilisateur>>;
interface EtatDon {
  id_don: number;
  statut: string;
  montant: number;
  devise: string;
  code_erreur?: string;
  message?: string;
  peut_reessayer?: boolean;
  demande_envoyee?: boolean;
}

// Dons payés par Notch Pay, avec le faux client des tests : le dernier chiffre du numéro décide du
// résultat, comme les numéros de test de Notch Pay (0 succès, 1 fonds insuffisants, 2 échec,
// 3 délai dépassé, 4 annulation).
describe('Dons payés par Notch Pay (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let notchPay: FauxNotchPay;
  let reconciliation: ReconciliationDonsService;
  let orga: Utilisateur;
  let idCagnotte: number;
  let adresse = 0;

  beforeAll(async () => {
    ({ app, prisma, jwt, notchPay } = await creerApplication());
    await viderBase(prisma);
    reconciliation = app.get(ReconciliationDonsService);
    orga = await creerUtilisateur(prisma, jwt);
    idCagnotte = (await creerCagnotte(prisma, orga.id_utilisateur)).id_cagnotte;
  });

  beforeEach(() => {
    notchPay.reinitialiser();
  });

  afterAll(async () => {
    await app.close();
  });

  // Chaque don vient d'un nouveau donateur et d'une nouvelle adresse IP : les limites de
  // tentatives ne gênent pas les autres tests.
  async function donner(
    numero: string,
    options: { donateur?: Utilisateur; montant?: number; langue?: string } = {},
  ) {
    const donateur = options.donateur ?? (await creerUtilisateur(prisma, jwt));
    adresse += 1;
    const reponse = await request(app.getHttpServer())
      .post('/dons')
      .set(entete(donateur.jeton))
      .set('X-Forwarded-For', `10.1.0.${adresse}`)
      .set('Accept-Language', options.langue ?? 'fr')
      .send({
        id_cagnotte: idCagnotte,
        montant: options.montant ?? 5000,
        methode_paiement: 'MTN_MOBILE_MONEY',
        numero_payeur: numero,
      });
    return { reponse, donateur, don: reponse.body as EtatDon };
  }

  async function verifier(idDon: number, donateur: Utilisateur, langue = 'fr') {
    const reponse = await request(app.getHttpServer())
      .post(`/dons/${idDon}/verifier-statut`)
      .set(entete(donateur.jeton))
      .set('Accept-Language', langue);
    expect(reponse.status).toBe(201);
    return reponse.body as EtatDon;
  }

  const collecte = async () =>
    Number(
      (
        await prisma.cagnotte.findUniqueOrThrow({
          where: { id_cagnotte: idCagnotte },
        })
      ).montant_collecte,
    );

  const paiementDe = (idDon: number) =>
    prisma.paiement.findFirstOrThrow({ where: { don: { id_don: idDon } } });

  // Vieillit un don pour la réconciliation.
  const vieillir = (idDon: number, minutes: number) =>
    prisma.don.update({
      where: { id_don: idDon },
      data: { date_creation: new Date(Date.now() - minutes * 60_000) },
    });

  it('succès : le don est créé EN_ATTENTE, initialisé et traité chez Notch Pay, puis validé', async () => {
    const avant = await collecte();
    const { reponse, don, donateur } = await donner('670000000');
    expect(reponse.status).toBe(201);
    expect(don).toMatchObject({
      statut: 'EN_ATTENTE',
      demande_envoyee: true, // la demande est bien partie vers l'opérateur
      montant: 5000,
      devise: 'XAF',
    });

    // Paiement enregistré avec notre référence et celle de Notch Pay.
    const paiement = await paiementDe(don.id_don);
    expect(paiement).toMatchObject({
      reference: `SOLIFUND-DON-${don.id_don}`,
      reference_fournisseur: notchPay.paiements[0].reference,
      canal: 'cm.mtn',
      numero_payeur: '+237670000000',
      statut: 'EN_ATTENTE',
    });
    // Ce qui a été envoyé à Notch Pay.
    const cagnotte = await prisma.cagnotte.findUniqueOrThrow({
      where: { id_cagnotte: idCagnotte },
    });
    expect(notchPay.paiements[0]).toMatchObject({
      nouveau: {
        montant: 5000,
        devise: 'XAF',
        reference: `SOLIFUND-DON-${don.id_don}`,
        description: `Don pour ${cagnotte.titre}`,
        client: {
          nom: `${donateur.prenom} ${donateur.nom}`,
          email: donateur.email,
          telephone: '+237670000000',
        },
      },
      canal: 'cm.mtn',
      numero: '+237670000000',
    });
    expect(await collecte()).toBe(avant); // rien n'est compté avant la confirmation

    expect(await verifier(don.id_don, donateur)).toMatchObject({
      statut: 'VALIDE',
    });
    expect(await collecte()).toBe(avant + 5000);
    expect((await paiementDe(don.id_don)).statut).toBe('VALIDE');
    expect(
      await prisma.recevoir.count({
        where: {
          id_utilisateur: orga.id_utilisateur,
          notification: { code: 'DON_RECU' },
        },
      }),
    ).toBe(1);
  });

  it('fonds insuffisants : le don échoue avec un message lisible, et peut être retenté', async () => {
    const avant = await collecte();
    const { don, donateur } = await donner('670000001');
    expect(don.statut).toBe('EN_ATTENTE');

    const etat = await verifier(don.id_don, donateur);
    expect(etat).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'INSUFFICIENT_BALANCE',
      peut_reessayer: true,
    });
    expect(etat.message).toContain('solde de votre compte Mobile Money');
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'INSUFFICIENT_BALANCE',
      message_erreur: 'Insufficient funds',
    });
    expect(await collecte()).toBe(avant);

    // Même message en anglais sur demande.
    expect((await verifier(don.id_don, donateur, 'en')).message).toContain(
      'Your Mobile Money balance is too low',
    );
  });

  it('échec sans code : message générique', async () => {
    const { don, donateur } = await donner('670000002');
    const etat = await verifier(don.id_don, donateur);
    expect(etat).toMatchObject({ statut: 'ECHOUE', peut_reessayer: true });
    expect(etat.message).toBe(
      "Le paiement n'a pas abouti. Aucun montant n'a été débité. Veuillez réessayer.",
    );
  });

  it('annulation par le client : le don échoue et peut être retenté', async () => {
    const { don, donateur } = await donner('670000004');
    const etat = await verifier(don.id_don, donateur);
    expect(etat).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'CANCELLED_BY_USER',
      peut_reessayer: true,
    });
    expect(etat.message).toContain('Vous avez annulé le paiement');
  });

  it('délai dépassé : jamais échoué sans statut final, puis annulé après 30 minutes', async () => {
    const { don, donateur } = await donner('670000003');
    expect((await verifier(don.id_don, donateur)).statut).toBe('EN_ATTENTE');

    // Moins de 2 minutes : la réconciliation ne le consulte pas.
    notchPay.consultations = 0;
    await reconciliation.reconcilier();
    expect(notchPay.consultations).toBe(0);

    // Après 2 minutes : consulté, toujours en cours, donc toujours EN_ATTENTE.
    await vieillir(don.id_don, 3);
    expect(await reconciliation.reconcilier()).toMatchObject({
      consultes: 1,
      echoues: 0,
      abandonnes: 0,
    });
    expect((await paiementDe(don.id_don)).statut).toBe('EN_ATTENTE');
    expect(notchPay.annulations).toHaveLength(0);

    // Après 30 minutes : annulé chez Notch Pay, puis ECHOUE.
    await vieillir(don.id_don, 31);
    expect(await reconciliation.reconcilier()).toMatchObject({ abandonnes: 1 });
    expect(notchPay.annulations).toEqual([notchPay.paiements[0].reference]);
    const etat = await verifier(don.id_don, donateur);
    expect(etat).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'TIMEOUT',
      peut_reessayer: true,
    });
    expect(etat.message).toContain("n'a pas été confirmé à temps");
  });

  it('la réconciliation valide un don confirmé après la fermeture de la page', async () => {
    const avant = await collecte();
    const { don } = await donner('670000000', { montant: 2500 });
    await vieillir(don.id_don, 5);
    expect(await reconciliation.reconcilier()).toMatchObject({ valides: 1 });
    expect(await collecte()).toBe(avant + 2500);
  });

  it('montant incohérent : le don n’est pas validé', async () => {
    const avant = await collecte();
    const { don, donateur } = await donner('670000000', { montant: 5000 });
    notchPay.montantRenvoye = 500; // Notch Pay annonce un paiement de 500 XAF pour un don de 5 000
    const etat = await verifier(don.id_don, donateur);
    expect(etat).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'MONTANT_INCOHERENT',
      peut_reessayer: false,
    });
    expect(etat.message).toContain('ne correspond pas à votre don');
    expect(await collecte()).toBe(avant);
    expect(
      await prisma.transaction.count({
        where: { paiement: { don: { id_don: don.id_don } } },
      }),
    ).toBe(0);
  });

  it('devise incohérente : le don n’est pas validé', async () => {
    const avant = await collecte();
    const { don, donateur } = await donner('670000000');
    notchPay.deviseRenvoyee = 'XOF';
    expect((await verifier(don.id_don, donateur)).code_erreur).toBe(
      'MONTANT_INCOHERENT',
    );
    expect(await collecte()).toBe(avant);
  });

  it('double validation impossible : vérifications et réconciliation simultanées', async () => {
    const avant = await collecte();
    const { don, donateur } = await donner('670000000', { montant: 3000 });
    await vieillir(don.id_don, 3);

    const resultats = await Promise.all([
      verifier(don.id_don, donateur),
      verifier(don.id_don, donateur),
      verifier(don.id_don, donateur),
      reconciliation.reconcilier(),
    ]);
    expect(
      resultats.slice(0, 3).every((r) => (r as EtatDon).statut === 'VALIDE'),
    ).toBe(true);

    expect(await collecte()).toBe(avant + 3000);
    expect(
      await prisma.transaction.count({
        where: { paiement: { don: { id_don: don.id_don } } },
      }),
    ).toBe(1);
    // Une vérification de plus ne change rien.
    await verifier(don.id_don, donateur);
    await reconciliation.reconcilier();
    expect(await collecte()).toBe(avant + 3000);
  });

  it('refus définitif à l’initialisation : le don passe en ECHOUE (audit A8)', async () => {
    notchPay.erreurs.initialiser = new ErreurValidationPaiement(
      'Validation failed',
      { statutHttp: 422, code: '422' },
    );
    const { reponse, don } = await donner('670000000');
    expect(reponse.status).toBe(201);
    expect(don).toMatchObject({ statut: 'ECHOUE', peut_reessayer: true });
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: '422',
      message_erreur: 'Validation failed',
      reference_fournisseur: null,
    });
  });

  it('refus définitif au traitement : le don passe en ECHOUE avec le code de Notch Pay', async () => {
    notchPay.erreurs.traiter = new ErreurValidationPaiement('Invalid phone', {
      statutHttp: 422,
      code: 'INVALID_PHONE',
    });
    const { don } = await donner('670000000');
    expect(don).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'INVALID_PHONE',
      peut_reessayer: false,
    });
    expect(don.message).toContain("n'est pas valide");
  });

  it('refus réel « Invalid CM Mobile Money » (422) : enregistré, et compris comme numéro invalide', async () => {
    notchPay.erreurs.traiter = new ErreurValidationPaiement(
      'Invalid CM Mobile Money',
      { statutHttp: 422, code: '422' },
    );
    const { don } = await donner('670000000');
    expect(don).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'INVALID_PHONE',
      peut_reessayer: false,
    });
    expect(don.message).toContain("n'est pas valide");
    expect(await paiementDe(don.id_don)).toMatchObject({
      code_erreur: 'INVALID_PHONE',
      message_erreur: 'Invalid CM Mobile Money',
    });
  });

  it('paiement « failed » sans raison (cas réel) : message générique, échec enregistré', async () => {
    const { don, donateur } = await donner('670000002');
    notchPay.messageEchecAbsent = true; // comme Notch Pay : aucune raison dans la réponse
    const etat = await verifier(don.id_don, donateur);
    expect(etat).toMatchObject({ statut: 'ECHOUE', peut_reessayer: true });
    expect(etat.message).toBe(
      "Le paiement n'a pas abouti. Aucun montant n'a été débité. Veuillez réessayer.",
    );
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: null,
      message_erreur: 'Statut « failed », aucune raison fournie.',
    });
  });

  it('échec temporaire : le don reste EN_ATTENTE pour la réconciliation', async () => {
    notchPay.erreurs.initialiser = new ErreurReseauPaiement(
      'Notch Pay est injoignable (ECONNABORTED).',
    );
    const { reponse, don } = await donner('670000000');
    expect(reponse.status).toBe(201);
    expect(don).toMatchObject({
      statut: 'INDISPONIBLE',
      demande_envoyee: false,
      peut_reessayer: true,
    });
    expect(don.message).toBe(
      "Le service de paiement ne répond pas pour le moment. Aucun montant n'a été prélevé. Réessayez dans quelques minutes.",
    );
    // Aucune demande n'est partie vers l'opérateur : le don ne reste pas EN_ATTENTE.
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'SERVICE_INDISPONIBLE',
      reference_fournisseur: null,
    });
  });

  it('Notch Pay indisponible au traitement : le paiement est annulé, puis le don passe en ECHOUE', async () => {
    notchPay.erreurs.traiter = new ErreurServeurPaiement(
      'The payment service is temporarily unavailable',
      { statutHttp: 503, code: '503' },
    );
    const { don, donateur } = await donner('670000000');
    expect(don).toMatchObject({
      statut: 'INDISPONIBLE',
      demande_envoyee: false,
    });
    expect(don.message).toContain("Aucun montant n'a été prélevé");

    // Le paiement initialisé a été annulé chez Notch Pay : plus aucun argent ne peut bouger.
    expect(notchPay.annulations).toEqual([notchPay.paiements[0].reference]);
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'SERVICE_INDISPONIBLE',
      message_erreur: 'The payment service is temporarily unavailable',
    });
    // Une vérification ultérieure redonne le même message.
    expect(await verifier(don.id_don, donateur)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'SERVICE_INDISPONIBLE',
      peut_reessayer: true,
    });
  });

  it('indisponible au traitement et annulation impossible : EN_ATTENTE pour la réconciliation', async () => {
    notchPay.erreurs.traiter = new ErreurServeurPaiement('unavailable', {
      statutHttp: 503,
    });
    notchPay.erreurs.annuler = new ErreurReseauPaiement('injoignable');
    const { don } = await donner('670000000');
    // Le donateur ne voit pas « Confirmez sur votre téléphone » : la demande n'est pas confirmée.
    expect(don).toMatchObject({
      statut: 'INDISPONIBLE',
      demande_envoyee: false,
    });
    expect(don.message).toContain('ne la validez pas');
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'EN_ATTENTE',
      code_erreur: null,
    });

    // La réconciliation tranche : ce paiement jamais traité est annulé après 30 minutes.
    await vieillir(don.id_don, 31);
    await reconciliation.reconcilier();
    expect(await paiementDe(don.id_don)).toMatchObject({
      statut: 'ECHOUE',
      code_erreur: 'TIMEOUT',
    });
  });

  it('refuse un numéro d’un autre opérateur que celui choisi, sans rien créer ni appeler Notch Pay', async () => {
    const avant = await prisma.don.count();
    // donner() choisit MTN Mobile Money : 699… est un numéro Orange (cas réel du don 34).
    const orange = await donner('699415795');
    expect(orange.reponse.status).toBe(400);
    expect((orange.reponse.body as { message: string }).message).toBe(
      'Ce numéro est un numéro Orange.',
    );
    const anglais = await donner('691000000', { langue: 'en' });
    expect((anglais.reponse.body as { message: string }).message).toBe(
      'This is an Orange number.',
    );
    expect(await prisma.don.count()).toBe(avant);
    expect(notchPay.paiements).toHaveLength(0);

    // Préfixe inconnu (ni MTN ni Orange dans la configuration) : pas de contrôle.
    expect((await donner('662000000')).reponse.status).toBe(201);
  });

  it('Notch Pay injoignable à la vérification : le statut ne change pas', async () => {
    const { don, donateur } = await donner('670000001');
    notchPay.erreurs.consulter = new ErreurReseauPaiement('injoignable');
    expect((await verifier(don.id_don, donateur)).statut).toBe('EN_ATTENTE');
    expect((await verifier(don.id_don, donateur)).statut).toBe('ECHOUE');
  });

  it('refuse un numéro invalide sans rien créer', async () => {
    const avant = await prisma.don.count();
    const { reponse } = await donner('12345');
    expect(reponse.status).toBe(400);
    expect(await prisma.don.count()).toBe(avant);
    expect(notchPay.paiements).toHaveLength(0);
  });

  it('un autre utilisateur ne peut pas vérifier le don', async () => {
    const { don } = await donner('670000003');
    const autre = await creerUtilisateur(prisma, jwt);
    const reponse = await request(app.getHttpServer())
      .post(`/dons/${don.id_don}/verifier-statut`)
      .set(entete(autre.jeton));
    expect(reponse.status).toBe(403);
  });

  it('limite les tentatives de don par utilisateur', async () => {
    const donateur = await creerUtilisateur(prisma, jwt);
    for (let i = 0; i < 5; i += 1) {
      expect((await donner('670000002', { donateur })).reponse.status).toBe(
        201,
      );
    }
    const avant = await prisma.don.count();
    const { reponse } = await donner('670000000', { donateur });
    expect(reponse.status).toBe(429);
    expect((reponse.body as { message: string }).message).toContain(
      'trop de tentatives de don',
    );
    expect(await prisma.don.count()).toBe(avant);
  });
});
