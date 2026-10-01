import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createServer, IncomingMessage, Server } from 'http';
import { AddressInfo } from 'net';
import { AangaraaPayClient, type EchangeAangaraa } from './aangaraa.client';
import { AangaraaPayFournisseur } from './aangaraa.fournisseur';
import {
  ErreurAuthentificationPaiement,
  ErreurConfigurationPaiement,
  ErreurIntrouvablePaiement,
  ErreurPaiement,
  ErreurReseauPaiement,
  ErreurServeurPaiement,
  ErreurValidationPaiement,
} from './paiement.erreurs';

const CLE = 'cle-secrete-aangaraa-123';
const JETON = 'jeton-secret-du-webhook-aangaraa-0123456789';

interface RequeteRecue {
  methode: string;
  url: string;
  entetes: IncomingMessage['headers'];
  corps: unknown;
}
type Reponse = { statut: number; corps?: unknown } | 'couper';

// Exemples de réponses recopiés de la documentation (docs/paiement/aangaraa-api.md).
const EXEMPLES = {
  initiationMtn: {
    statusCode: 201,
    message: 'Paiement initié avec succès',
    data: {
      payToken: 'e92224da-1987-47e6-958b-78433bd92a66',
      status: 'PENDING',
    },
  },
  initiationOrange: {
    statusCode: 201,
    message: 'PENDING',
    data: { payToken: 'MP2512295AD67EBB09E121E235B2', status: 'PENDING' },
  },
  statutReussi: {
    success: true,
    status: 'SUCCESSFUL',
    operator: 'MTN_Cameroon',
    transaction_id: '856',
    pay_token: 'e92224da-1987-47e6-958b-78433bd92a66',
    amount: 10,
    currency: 'XAF',
    message: 'Paiement réussi',
    operator_code: 'SUCCESSFUL',
    timestamp: null,
    phone_number: '237651534499',
    details: {
      financialTransactionId: '15284828790',
      reason: null,
      payerMessage: 'Veillez confirmer la transcation',
      payeeNote: 'AANGARAA-PAY',
    },
  },
  statutEchoue: {
    success: false,
    status: 'FAILED',
    operator: 'MTN_Cameroon',
    transaction_id: '856',
    pay_token: 'e92224da-1987-47e6-958b-78433bd92a66',
    amount: 10,
    currency: 'XAF',
    message: 'Paiement échoué',
    operator_code: 'FAILED',
    timestamp: null,
    phone_number: '237651534499',
    details: { reason: 'Solde insuffisant' },
  },
  solde: {
    message: 'Balance retrieved successfully',
    data: {
      service_id: 123,
      service_name: 'Mon Service E-commerce',
      app_key: CLE,
      balance_in_db: 150000.0,
      balance_details: {
        mtn_cameroon: {
          amount: 90000.0,
          transactions_count: 12,
          currency: 'XAF',
        },
        orange_cameroon: {
          amount: 60000.0,
          transactions_count: 8,
          currency: 'XAF',
        },
        total: { amount: 150000.0, transactions_count: 20, currency: 'XAF' },
      },
    },
  },
  abonne: {
    message: 'success',
    data: {
      description: 'User info retrieved successfully',
      msisdn: '690000000',
      api_key: CLE,
      country: 'Cameroon',
      operator: 'Orange_Cameroon',
      full_name: 'JOHN DOE',
    },
  },
  versementEnCours: {
    statusCode: 200,
    message: 'Withdrawal initiated',
    data: {
      status: 'PENDING',
      reference_id: 'abc123def456',
      amount: '1000',
      phone_number: '2376xxxxxxxx',
      payment_method: 'MTN_Cameroon',
      message: 'Withdrawal is being processed',
    },
  },
  versementReussi: {
    success: true,
    status: 'SUCCESSFUL',
    operator: 'MTN_Cameroon',
    transaction_id: 'abc123def456',
    amount: 1000.0,
    currency: 'XAF',
    message: 'Transaction réussie',
    operator_code: 'SUCCESSFUL',
    timestamp: '2025-12-29T14:30:15',
    details: { financialTransactionId: 'MT789012345', reason: null },
  },
  versementEchoue: {
    success: true,
    status: 'FAILED',
    operator: 'MTN_Cameroon',
    transaction_id: 'abc123def456',
    amount: 1000.0,
    currency: 'XAF',
    message: 'Transaction échouée',
    operator_code: 'FAILED',
    timestamp: '2025-12-29T14:30:15',
    details: { financialTransactionId: null, reason: 'Invalid phone number' },
  },
  versementIntrouvable: {
    success: true,
    status: 'NOT_FOUND',
    operator: 'Orange_Cameroon',
    transaction_id: 'abc123def456',
    message: 'Transaction introuvable',
    currency: 'XAF',
  },
  soldeInsuffisant: {
    statusCode: 400,
    message: 'Insufficient balance',
    data: {
      description: 'Insufficient balance for Orange_Cameroon',
      available_balance: 500.0,
      requested_amount: 1000.0,
      operator: 'Orange_Cameroon',
    },
  },
  serviceIntrouvable: {
    statusCode: 404,
    message: 'Service not found',
    data: { description: 'Invalid app_key. Service does not exist.' },
  },
  abonneIntrouvable: {
    message: 'Failed to retrieve Orange user info',
    data: {
      description: 'User not found or invalid phone number',
      msisdn: '690000000',
      api_key: CLE,
      country: 'Cameroon',
      operator: 'Orange_Cameroon',
      code: 'USER_NOT_FOUND',
    },
  },
};

describe('AangaraaPayClient (HTTP simulé avec les exemples de la documentation)', () => {
  let serveur: Server;
  let client: AangaraaPayClient;
  let fournisseur: AangaraaPayFournisseur;
  let recues: RequeteRecue[];
  let reponses: Reponse[];
  let avertissements: jest.SpyInstance;
  let echanges: EchangeAangaraa[];

  function creerClient(url: string) {
    const valeurs: Record<string, string> = {
      AANGARAA_API_URL: url,
      AANGARAA_APP_KEY: CLE,
      AANGARAA_WEBHOOK_JETON: JETON,
      PUBLIC_API_URL: 'https://api.solifund.cm/',
    };
    const nouveau = new AangaraaPayClient({
      get: (nom: string) => valeurs[nom],
    } as unknown as ConfigService);
    nouveau.delaisNouvelEssaiMs = [5, 10];
    return nouveau;
  }

  beforeAll(async () => {
    serveur = createServer((requete, reponse) => {
      const morceaux: Buffer[] = [];
      requete.on('data', (morceau: Buffer) => morceaux.push(morceau));
      requete.on('end', () => {
        const texte = Buffer.concat(morceaux).toString();
        recues.push({
          methode: requete.method ?? '',
          url: requete.url ?? '',
          entetes: requete.headers,
          corps: texte ? (JSON.parse(texte) as unknown) : undefined,
        });
        const prevue = reponses.shift() ?? { statut: 500, corps: {} };
        if (prevue === 'couper') {
          requete.socket.destroy();
          return;
        }
        reponse.writeHead(prevue.statut, {
          'Content-Type': 'application/json',
        });
        reponse.end(JSON.stringify(prevue.corps ?? {}));
      });
    });
    await new Promise<void>((resolve) =>
      serveur.listen(0, '127.0.0.1', resolve),
    );
  });

  afterAll(async () => {
    await new Promise((resolve) => serveur.close(resolve));
  });

  beforeEach(() => {
    recues = [];
    reponses = [];
    echanges = [];
    avertissements = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { port } = serveur.address() as AddressInfo;
    client = creerClient(`http://127.0.0.1:${port}`);
    client.surEchange = (e) => echanges.push(e);
    fournisseur = new AangaraaPayFournisseur(client);
  });

  afterEach(() => {
    avertissements.mockRestore();
  });

  describe('paiement direct', () => {
    it('envoie la requête documentée, sans en-tête d’authentification, et garde le payToken', async () => {
      reponses.push({ statut: 201, corps: EXEMPLES.initiationMtn });
      const resultat = await client.payerDirect({
        numero: '+237677123456',
        montant: 1000,
        description: 'Don pour Junior',
        reference: 'SOLIFUND-DON-12',
        methode: 'MTN_MOBILE_MONEY',
      });
      expect(recues[0]).toMatchObject({
        methode: 'POST',
        url: '/api/v1/no_redirect/payment',
      });
      expect(recues[0].corps).toEqual({
        phone_number: '237677123456',
        amount: '1000', // en chaîne
        description: 'Don pour Junior',
        app_key: CLE,
        transaction_id: 'SOLIFUND-DON-12',
        // Adresse du webhook, avec son jeton secret (les notifications ne sont pas signées).
        notify_url: `https://api.solifund.cm/paiements/webhook/aangaraa/${JETON}`,
        operator: 'MTN_Cameroon',
        devise_id: 'XAF',
      });
      expect(recues[0].entetes.authorization).toBeUndefined();
      expect(resultat).toMatchObject({
        reference: 'e92224da-1987-47e6-958b-78433bd92a66',
        statut: 'PENDING',
      });
    });

    it('Orange : opérateur Orange_Cameroon, payToken « MP… »', async () => {
      reponses.push({ statut: 201, corps: EXEMPLES.initiationOrange });
      const resultat = await fournisseur.initierPaiement({
        montant: 2500,
        devise: 'XAF',
        reference: 'SOLIFUND-DON-13',
        description: 'Don',
        methode: 'ORANGE_MONEY',
        numero: '+237690000000',
        client: { nom: 'Awa' },
      });
      expect(recues[0].corps).toMatchObject({
        phone_number: '237690000000',
        amount: '2500',
        operator: 'Orange_Cameroon',
      });
      expect(resultat).toMatchObject({
        referenceFournisseur: 'MP2512295AD67EBB09E121E235B2',
        statut: 'EN_ATTENTE',
        statutFournisseur: 'PENDING',
        demandeEnvoyee: true,
      });
    });

    it('réponse sans payToken : refus définitif, avec la raison renvoyée', async () => {
      reponses.push({
        statut: 201,
        corps: {
          statusCode: 201,
          message: 'Numéro non enregistré chez l’opérateur',
          data: { status: 'FAILED' },
        },
      });
      const erreur = (await fournisseur
        .initierPaiement({
          montant: 100,
          devise: 'XAF',
          reference: 'r',
          description: 'x',
          methode: 'MTN_MOBILE_MONEY',
          numero: '+237677123456',
          client: { nom: 'Awa' },
        })
        .catch((e: unknown) => e)) as ErreurPaiement;
      expect(erreur).toBeInstanceOf(ErreurValidationPaiement);
      expect(erreur.message).toBe('Numéro non enregistré chez l’opérateur');
      expect(erreur.code).toBe('FAILED');
      // Rien n'est parti vers le téléphone : le don pourra passer en ECHOUE.
      expect(erreur.demandePeutEtrePartie).toBe(false);
    });

    it('5xx : nouvel essai ; sans réponse, la demande a peut-être été envoyée', async () => {
      reponses.push(
        { statut: 502, corps: { message: 'Bad gateway' } },
        { statut: 201, corps: EXEMPLES.initiationMtn },
      );
      await client.payerDirect({
        numero: '+237677123456',
        montant: 100,
        description: 'x',
        reference: 'r1',
        methode: 'MTN_MOBILE_MONEY',
      });
      expect(recues).toHaveLength(2);

      reponses.length = 0;
      recues = [];
      reponses.push('couper', 'couper', 'couper');
      const erreur = await fournisseur
        .initierPaiement({
          montant: 100,
          devise: 'XAF',
          reference: 'r2',
          description: 'x',
          methode: 'MTN_MOBILE_MONEY',
          numero: '+237677123456',
          client: { nom: 'Awa' },
        })
        // Rejet attendu : un succès fait échouer le test.
        .then(
          () => {
            throw new Error('Échec attendu');
          },
          (e: unknown) => e as ErreurPaiement,
        );
      expect(erreur).toBeInstanceOf(ErreurReseauPaiement);
      expect(erreur.demandePeutEtrePartie).toBe(true);
      expect(recues).toHaveLength(3);
    });

    it('4xx : pas de nouvel essai, la demande n’est pas partie', async () => {
      reponses.push({
        statut: 400,
        corps: {
          message: 'Invalid amount',
          data: { description: 'Amount must be greater than 0' },
        },
      });
      const erreur = await fournisseur
        .initierPaiement({
          montant: 0,
          devise: 'XAF',
          reference: 'r3',
          description: 'x',
          methode: 'MTN_MOBILE_MONEY',
          numero: '+237677123456',
          client: { nom: 'Awa' },
        })
        // Rejet attendu : un succès fait échouer le test.
        .then(
          () => {
            throw new Error('Échec attendu');
          },
          (e: unknown) => e as ErreurPaiement,
        );
      expect(erreur).toBeInstanceOf(ErreurValidationPaiement);
      expect(erreur.message).toBe('Amount must be greater than 0');
      expect(erreur.demandePeutEtrePartie).toBe(false);
      expect(recues).toHaveLength(1);
    });
  });

  describe('statut d’un paiement', () => {
    it('SUCCESSFUL : montant, devise et numéro du payeur', async () => {
      reponses.push({ statut: 200, corps: EXEMPLES.statutReussi });
      const operation = await fournisseur.consulterPaiement(
        'e92224da-1987-47e6-958b-78433bd92a66',
      );
      expect(recues[0]).toMatchObject({
        methode: 'POST',
        url: '/api/v1/aangaraa_check_status',
        corps: {
          payToken: 'e92224da-1987-47e6-958b-78433bd92a66',
          app_key: CLE,
        },
      });
      expect(operation).toMatchObject({
        referenceFournisseur: 'e92224da-1987-47e6-958b-78433bd92a66',
        statut: 'VALIDE',
        statutFournisseur: 'SUCCESSFUL',
        montant: 10,
        devise: 'XAF',
        telephone: '237651534499',
      });
    });

    it('FAILED : raison de l’opérateur et code Mobile Money reconnu', async () => {
      reponses.push({ statut: 200, corps: EXEMPLES.statutEchoue });
      expect(await fournisseur.consulterPaiement('tok')).toMatchObject({
        statut: 'ECHOUE',
        statutFournisseur: 'FAILED',
        codeErreur: 'INSUFFICIENT_BALANCE',
        messageErreur: 'Solde insuffisant',
      });
    });

    it.each([
      ['PENDING', 'EN_ATTENTE', undefined],
      ['CANCELLED', 'ECHOUE', 'CANCELLED_BY_USER'],
      ['EXPIRED', 'ECHOUE', 'TIMEOUT'],
    ])('%s → %s', async (statut, attendu, code) => {
      reponses.push({
        statut: 200,
        corps: {
          ...EXEMPLES.statutReussi,
          status: statut,
          details: { reason: null },
        },
      });
      const operation = await fournisseur.consulterPaiement('tok');
      expect(operation.statut).toBe(attendu);
      expect(operation.codeErreur).toBe(code);
    });

    it('AangaraaPay ne permet pas d’annuler un paiement', async () => {
      expect(fournisseur.peutAnnuler).toBe(false);
      await expect(fournisseur.annulerPaiement()).rejects.toBeInstanceOf(
        ErreurConfigurationPaiement,
      );
      expect(recues).toHaveLength(0);
    });
  });

  describe('versements', () => {
    it('envoie le versement documenté et garde le reference_id', async () => {
      reponses.push({ statut: 200, corps: EXEMPLES.versementEnCours });
      const operation = await fournisseur.initierVersement({
        montant: 9700,
        reference: 'SOLIFUND-RET-4',
        description: 'Retrait',
        methode: 'MTN_MOBILE_MONEY',
        numero: '+237677123456',
        nomBeneficiaire: 'Paul Mbarga',
      });
      expect(recues[0]).toMatchObject({
        methode: 'POST',
        url: '/api/v1/aangaraa-pay/withdrawal',
      });
      expect(recues[0].corps).toEqual({
        app_key: CLE,
        phone_number: '237677123456',
        amount: '9700',
        payment_method: 'MTN_Cameroon',
        username: 'Paul Mbarga',
      });
      expect(operation).toMatchObject({
        referenceFournisseur: 'abc123def456',
        statut: 'EN_ATTENTE',
      });
    });

    it('ne réessaie JAMAIS un versement (5xx ou erreur réseau)', async () => {
      const versement = {
        montant: 1000,
        reference: 'SOLIFUND-RET-5',
        description: 'Retrait',
        methode: 'ORANGE_MONEY' as const,
        numero: '+237690000000',
        nomBeneficiaire: 'Awa',
      };
      reponses.push({ statut: 503, corps: { message: 'Unavailable' } });
      await expect(
        fournisseur.initierVersement(versement),
      ).rejects.toBeInstanceOf(ErreurServeurPaiement);
      expect(recues).toHaveLength(1);

      recues = [];
      reponses.length = 0;
      reponses.push('couper');
      await expect(
        fournisseur.initierVersement(versement),
      ).rejects.toBeInstanceOf(ErreurReseauPaiement);
      expect(recues).toHaveLength(1);
    });

    it('solde insuffisant (400) : message de la documentation', async () => {
      reponses.push({ statut: 400, corps: EXEMPLES.soldeInsuffisant });
      const erreur = await client
        .verser({
          numero: '+237690000000',
          montant: 1000,
          methode: 'ORANGE_MONEY',
        })
        // Rejet attendu : un succès fait échouer le test.
        .then(
          () => {
            throw new Error('Échec attendu');
          },
          (e: unknown) => e as ErreurPaiement,
        );
      expect(erreur).toBeInstanceOf(ErreurValidationPaiement);
      expect(erreur.message).toBe('Insufficient balance for Orange_Cameroon');
      expect(erreur.code).toBe('Insufficient balance');
    });

    it('statut d’un versement : GET avec payment_method, SUCCESSFUL, FAILED, NOT_FOUND', async () => {
      reponses.push({ statut: 200, corps: EXEMPLES.versementReussi });
      expect(
        await fournisseur.consulterVersement('abc123def456', 'ORANGE_MONEY'),
      ).toMatchObject({ statut: 'VALIDE', montant: 1000 });
      expect(recues[0]).toMatchObject({
        methode: 'GET',
        url: '/api/v1/check_withdrawal_status/abc123def456?payment_method=Orange_Cameroon',
      });

      reponses.push({ statut: 200, corps: EXEMPLES.versementEchoue });
      expect(
        await fournisseur.consulterVersement(
          'abc123def456',
          'MTN_MOBILE_MONEY',
        ),
      ).toMatchObject({
        statut: 'ECHOUE',
        codeErreur: 'INVALID_PHONE',
        messageErreur: 'Invalid phone number',
      });

      reponses.push({ statut: 200, corps: EXEMPLES.versementIntrouvable });
      await expect(
        fournisseur.consulterVersement('abc123def456', 'ORANGE_MONEY'),
      ).rejects.toBeInstanceOf(ErreurIntrouvablePaiement);
    });
  });

  describe('solde et abonné', () => {
    it('lit le solde total et par opérateur', async () => {
      reponses.push({ statut: 200, corps: EXEMPLES.solde });
      expect(await fournisseur.lireSolde()).toMatchObject({
        disponible: 150000,
        parMethode: { MTN_MOBILE_MONEY: 90000, ORANGE_MONEY: 60000 },
        devise: 'XAF',
      });
      expect(recues[0]).toMatchObject({
        methode: 'GET',
        url: `/api/v1/service/balance/${CLE}`,
      });
    });

    it('lit le nom complet d’un abonné (msisdn sans 237, clé « api_key »)', async () => {
      reponses.push({ statut: 200, corps: EXEMPLES.abonne });
      const infos = await client.infosAbonne('+237690000000', 'ORANGE_MONEY');
      expect(infos.nomComplet).toBe('JOHN DOE');
      expect(recues[0]).toMatchObject({
        methode: 'POST',
        url: '/api/v1/get_user_info',
        corps: {
          msisdn: '690000000',
          api_key: CLE,
          country: 'Cameroon',
          operator: 'Orange_Cameroon',
        },
      });

      reponses.push({ statut: 400, corps: EXEMPLES.abonneIntrouvable });
      await expect(
        client.infosAbonne('+237690000000', 'ORANGE_MONEY'),
      ).rejects.toMatchObject({
        name: 'ErreurValidationPaiement',
        code: 'USER_NOT_FOUND',
        message: 'User not found or invalid phone number',
      });
    });

    it('clé inconnue (404 « Service not found ») : erreur d’authentification', async () => {
      reponses.push({ statut: 404, corps: EXEMPLES.serviceIntrouvable });
      await expect(client.lireSolde()).rejects.toBeInstanceOf(
        ErreurAuthentificationPaiement,
      );
    });
  });

  describe('confidentialité de la clé', () => {
    it('n’écrit jamais la clé : logs, adresses, erreurs, échanges et réponses', async () => {
      // Le solde met la clé dans l'adresse, et la réponse la renvoie.
      reponses.push(
        { statut: 500, corps: { message: `erreur pour ${CLE}` } },
        { statut: 500, corps: { message: 'erreur' } },
        { statut: 500, corps: { message: 'erreur' } },
      );
      const erreur = (await client
        .lireSolde()
        .catch((e: unknown) => e)) as ErreurPaiement;
      reponses.push({ statut: 200, corps: EXEMPLES.solde });
      const solde = await client.lireSolde();
      reponses.push('couper', 'couper', 'couper');
      const reseau = (await client
        .consulterPaiement('tok')
        .catch((e: unknown) => e)) as ErreurPaiement;

      const ecrit = JSON.stringify([
        avertissements.mock.calls,
        echanges,
        { ...erreur, message: erreur.message },
        erreur.stack,
        solde.brut,
        { ...(reseau as object), message: reseau.message },
      ]);
      expect(avertissements).toHaveBeenCalled();
      expect(echanges.length).toBeGreaterThan(0);
      expect(ecrit).not.toContain(CLE);
      expect(ecrit).toContain('[clé masquée]');
    });

    it('masque aussi le jeton du webhook (notify_url) dans les échanges enregistrés', async () => {
      reponses.push({ statut: 500, corps: {} });
      reponses.push({ statut: 500, corps: {} });
      reponses.push({ statut: 500, corps: {} });
      await client
        .payerDirect({
          numero: '+237677123456',
          montant: 100,
          description: 'x',
          reference: 'r',
          methode: 'MTN_MOBILE_MONEY',
        })
        .catch(() => undefined);
      // Le vrai jeton part bien chez AangaraaPay...
      expect(JSON.stringify(recues[0].corps)).toContain(JETON);
      // ... mais n'est écrit nulle part.
      const ecrit = JSON.stringify([avertissements.mock.calls, echanges]);
      expect(ecrit).not.toContain(JETON);
      expect(ecrit).not.toContain(CLE);
    });
  });
});
