import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createServer, IncomingMessage, Server } from 'http';
import { AddressInfo } from 'net';
import { NotchPayClient, type EchangeNotchPay } from './notchpay.client';
import {
  ErreurAuthentificationNotchPay,
  ErreurConflitNotchPay,
  ErreurIntrouvableNotchPay,
  ErreurLimiteNotchPay,
  ErreurNotchPay,
  ErreurReponseNotchPay,
  ErreurReseauNotchPay,
  ErreurValidationNotchPay,
} from './notchpay.erreurs';

const CLE_PUBLIQUE = 'pk_test_cle-publique';
const CLE_PRIVEE = 'sk_test_cle-privee';

interface RequeteRecue {
  methode: string;
  url: string;
  entetes: IncomingMessage['headers'];
  corps: unknown;
}
type Reponse = { statut: number; corps?: unknown } | 'couper';

// Faux serveur Notch Pay : répond avec les réponses programmées, dans l'ordre, et garde les
// requêtes reçues.
describe('NotchPayClient (HTTP simulé)', () => {
  let serveur: Server;
  let client: NotchPayClient;
  let recues: RequeteRecue[];
  let reponses: Reponse[];
  let avertissements: jest.SpyInstance;

  const paiement = (statut: string, autres: object = {}) => ({
    status: 'Accepted',
    message: 'Payment initialized',
    code: 201,
    transaction: {
      id: 'pay_1',
      reference: 'trx.abc123',
      amount: 5000,
      currency: 'XAF',
      status: statut,
      ...autres,
    },
  });

  function creerClient(url: string, environnement = 'test', hash?: string) {
    const valeurs: Record<string, string | undefined> = {
      NOTCHPAY_API_URL: url,
      NOTCHPAY_PUBLIC_KEY: CLE_PUBLIQUE,
      NOTCHPAY_PRIVATE_KEY: CLE_PRIVEE,
      NOTCHPAY_WEBHOOK_HASH: hash,
      NODE_ENV: environnement,
    };
    const nouveau = new NotchPayClient({
      get: (nom: string) => valeurs[nom],
      getOrThrow: (nom: string) => valeurs[nom],
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
    avertissements = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { port } = serveur.address() as AddressInfo;
    client = creerClient(`http://127.0.0.1:${port}`);
  });

  afterEach(() => {
    avertissements.mockRestore();
  });

  describe('requêtes envoyées', () => {
    it('initialise un paiement : POST /payments avec la clé publique seulement', async () => {
      reponses.push({ statut: 201, corps: paiement('pending') });
      const resultat = await client.initialiserPaiement({
        montant: 5000,
        reference: 'SLF-DON-1',
        description: 'Don pour Junior',
        client: { nom: 'Awa Ngono', email: 'awa@solifund.test' },
      });

      expect(recues).toHaveLength(1);
      expect(recues[0]).toMatchObject({ methode: 'POST', url: '/payments' });
      expect(recues[0].entetes.authorization).toBe(CLE_PUBLIQUE);
      expect(recues[0].entetes['x-grant']).toBeUndefined();
      expect(recues[0].corps).toEqual({
        amount: 5000,
        currency: 'XAF',
        reference: 'SLF-DON-1',
        description: 'Don pour Junior',
        customer: { name: 'Awa Ngono', email: 'awa@solifund.test' },
      });
      expect(resultat).toMatchObject({
        reference: 'trx.abc123',
        statut: 'pending',
        montant: 5000,
        devise: 'XAF',
      });
    });

    it('traite un paiement : PUT /payments/{reference} avec le canal et le numéro', async () => {
      reponses.push({ statut: 202, corps: paiement('processing') });
      const resultat = await client.traiterPaiement(
        'trx.abc123',
        'cm.mtn',
        '+237670000000',
      );
      expect(recues[0]).toMatchObject({
        methode: 'PUT',
        url: '/payments/trx.abc123',
        corps: { channel: 'cm.mtn', data: { phone: '+237670000000' } },
      });
      expect(recues[0].entetes['x-grant']).toBeUndefined();
      expect(resultat.statut).toBe('processing');
    });

    it('consulte et annule un paiement', async () => {
      reponses.push({ statut: 202, corps: paiement('complete') });
      expect((await client.consulterPaiement('trx/abc 1')).statut).toBe(
        'complete',
      );
      // La référence est encodée dans l'URL.
      expect(recues[0]).toMatchObject({
        methode: 'GET',
        url: '/payments/trx%2Fabc%201',
      });

      reponses.push({
        statut: 202,
        corps: { code: 202, status: 'Accepted', message: 'Canceled' },
      });
      await expect(
        client.annulerPaiement('trx.abc123'),
      ).resolves.toBeUndefined();
      expect(recues[1]).toMatchObject({
        methode: 'DELETE',
        url: '/payments/trx.abc123',
      });
    });

    it('envoie X-Grant (clé privée) pour les versements et le solde', async () => {
      const versement = {
        code: 201,
        transfer: { reference: 'trf.1', status: 'sent', amount: 9700 },
      };
      reponses.push({ statut: 201, corps: versement });
      const initie = await client.initierVersement({
        montant: 9700,
        reference: 'SLF-RETRAIT-1',
        description: 'Retrait de la cagnotte 12',
        canal: 'cm.orange',
        beneficiaire: '+237690000000',
      });
      expect(recues[0]).toMatchObject({
        methode: 'POST',
        url: '/transfers',
        corps: {
          amount: 9700,
          currency: 'XAF',
          reference: 'SLF-RETRAIT-1',
          description: 'Retrait de la cagnotte 12',
          channel: 'cm.orange',
          recipient: '+237690000000',
        },
      });
      expect(recues[0].entetes.authorization).toBe(CLE_PUBLIQUE);
      expect(recues[0].entetes['x-grant']).toBe(CLE_PRIVEE);
      expect(initie).toMatchObject({ reference: 'trf.1', statut: 'sent' });

      reponses.push({ statut: 202, corps: versement });
      await client.consulterVersement('trf.1');
      expect(recues[1]).toMatchObject({
        methode: 'GET',
        url: '/transfers/trf.1',
      });
      expect(recues[1].entetes['x-grant']).toBe(CLE_PRIVEE);

      reponses.push({
        statut: 200,
        corps: {
          code: 200,
          balance: {
            available: 47000,
            total: 50000,
            pending: 2000,
            currency: 'XAF',
            environment: 'test',
          },
        },
      });
      expect(await client.lireSolde()).toMatchObject({
        disponible: 47000,
        total: 50000,
        enAttente: 2000,
        devise: 'XAF',
        environnement: 'test',
      });
      expect(recues[2]).toMatchObject({
        methode: 'GET',
        url: '/balance?currency=XAF',
      });
      expect(recues[2].entetes['x-grant']).toBe(CLE_PRIVEE);
    });
  });

  describe('lecture des réponses', () => {
    it('accepte « payment » à la place de « transaction » (exemples de la documentation)', async () => {
      reponses.push({
        statut: 201,
        corps: {
          payment: { reference: 'trx.xyz', status: 'pending' },
          authorization_url: 'https://pay.notchpay.co/trx.xyz',
        },
      });
      expect(await client.consulterPaiement('trx.xyz')).toMatchObject({
        reference: 'trx.xyz',
        statut: 'pending',
        urlAutorisation: 'https://pay.notchpay.co/trx.xyz',
      });
    });

    it('lit la raison d’un échec et notre référence', async () => {
      reponses.push({
        statut: 202,
        corps: paiement('failed', {
          merchant_reference: 'SLF-DON-1',
          error: { code: 'INSUFFICIENT_BALANCE', message: 'Balance too low' },
        }),
      });
      expect(await client.consulterPaiement('trx.abc123')).toMatchObject({
        statut: 'failed',
        referenceMarchand: 'SLF-DON-1',
        codeErreur: 'INSUFFICIENT_BALANCE',
        messageErreur: 'Balance too low',
      });
    });

    it('lève une erreur claire si le paiement est absent de la réponse', async () => {
      reponses.push({ statut: 200, corps: { code: 200, message: 'OK' } });
      await expect(client.consulterPaiement('trx.abc123')).rejects.toThrow(
        ErreurReponseNotchPay,
      );
    });
  });

  describe('erreurs', () => {
    const erreurDe = async (statut: number, corps: object) => {
      reponses.push({ statut, corps });
      return client.consulterPaiement('trx.abc123').then(
        () => {
          throw new Error('une erreur était attendue');
        },
        (e: unknown) => e as ErreurNotchPay,
      );
    };

    it.each([
      [401, ErreurAuthentificationNotchPay, 'Invalid API key'],
      [403, ErreurAuthentificationNotchPay, 'Missing grant key'],
      [404, ErreurIntrouvableNotchPay, 'Payment not found'],
      [
        409,
        ErreurConflitNotchPay,
        'A payment with this reference already exists',
      ],
      [400, ErreurValidationNotchPay, 'Invalid request parameters'],
      [429, ErreurLimiteNotchPay, 'Rate limit exceeded'],
    ])(
      '%i → exception typée, avec le code et le message de Notch Pay, sans nouvel essai',
      async (statut, classe, message) => {
        const erreur = await erreurDe(statut, {
          code: statut,
          status: 'Erreur',
          message,
        });
        expect(erreur).toBeInstanceOf(classe);
        expect(erreur).toBeInstanceOf(ErreurNotchPay);
        expect(erreur.message).toBe(message);
        expect(erreur.code).toBe(String(statut));
        expect(erreur.statutHttp).toBe(statut);
        expect(recues).toHaveLength(1); // jamais de nouvel essai sur un 4xx
      },
    );

    it('422 : garde les erreurs par champ', async () => {
      const erreur = await erreurDe(422, {
        code: 422,
        status: 'Unprocessable Entity',
        message: 'Validation failed',
        errors: { amount: ['Amount must be at least 100'] },
      });
      expect(erreur).toBeInstanceOf(ErreurValidationNotchPay);
      expect(erreur.erreursChamps).toEqual({
        amount: ['Amount must be at least 100'],
      });
      expect(recues).toHaveLength(1);
    });

    it('préfère le code métier au code numérique', async () => {
      const erreur = await erreurDe(422, {
        code: 422,
        message: 'Insufficient funds',
        error: { code: 'INSUFFICIENT_BALANCE' },
      });
      expect(erreur.code).toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('nouveaux essais', () => {
    it('réessaie après un 5xx, puis réussit', async () => {
      reponses.push(
        { statut: 502, corps: { message: 'Bad gateway' } },
        { statut: 503, corps: { message: 'Unavailable' } },
        { statut: 202, corps: paiement('complete') },
      );
      expect((await client.consulterPaiement('trx.abc123')).statut).toBe(
        'complete',
      );
      expect(recues).toHaveLength(3);
    });

    it('abandonne après 3 tentatives en 5xx', async () => {
      reponses.push(
        {
          statut: 500,
          corps: { code: 500, message: 'An unexpected error occurred' },
        },
        {
          statut: 500,
          corps: { code: 500, message: 'An unexpected error occurred' },
        },
        {
          statut: 500,
          corps: { code: 500, message: 'An unexpected error occurred' },
        },
      );
      await expect(
        client.consulterPaiement('trx.abc123'),
      ).rejects.toMatchObject({
        name: 'ErreurServeurNotchPay',
        message: 'An unexpected error occurred',
        statutHttp: 500,
      });
      expect(recues).toHaveLength(3);
    });

    it('réessaie après une erreur réseau, puis réussit', async () => {
      reponses.push('couper', { statut: 202, corps: paiement('complete') });
      expect((await client.consulterPaiement('trx.abc123')).statut).toBe(
        'complete',
      );
      expect(recues).toHaveLength(2);
    });

    it('attend de plus en plus longtemps entre les essais', async () => {
      client.delaisNouvelEssaiMs = [40, 120];
      reponses.push({ statut: 500 }, { statut: 500 }, { statut: 500 });
      const instants: number[] = [];
      client.surEchange = () => instants.push(Date.now());
      await expect(client.consulterPaiement('trx.abc123')).rejects.toThrow();
      expect(instants).toHaveLength(3);
      expect(instants[1] - instants[0]).toBeGreaterThanOrEqual(35);
      expect(instants[2] - instants[1]).toBeGreaterThanOrEqual(110);
    });

    it('lève ErreurReseauNotchPay quand le serveur est injoignable', async () => {
      const injoignable = creerClient('http://127.0.0.1:9');
      injoignable.delaisNouvelEssaiMs = [1, 1];
      const echanges: EchangeNotchPay[] = [];
      injoignable.surEchange = (e) => echanges.push(e);
      await expect(injoignable.consulterPaiement('trx.abc123')).rejects.toThrow(
        ErreurReseauNotchPay,
      );
      expect(echanges).toHaveLength(3);
    });
  });

  describe('confidentialité des clés', () => {
    it('n’écrit jamais les clés dans les logs, les erreurs ou les échanges', async () => {
      const echanges: EchangeNotchPay[] = [];
      client.surEchange = (e) => echanges.push(e);
      reponses.push(
        { statut: 500, corps: { message: 'Erreur' } },
        { statut: 500, corps: { message: 'Erreur' } },
        { statut: 500, corps: { message: 'Erreur' } },
      );
      const erreur = await client
        .initierVersement({
          montant: 1000,
          reference: 'SLF-RETRAIT-2',
          description: 'Test',
          canal: 'cm.mtn',
          beneficiaire: '+237670000000',
        })
        .catch((e: unknown) => e as ErreurNotchPay);

      const ecrit = JSON.stringify([
        avertissements.mock.calls,
        echanges,
        { ...(erreur as object), message: (erreur as Error).message },
        (erreur as Error).stack,
      ]);
      expect(avertissements).toHaveBeenCalled();
      expect(ecrit).not.toContain(CLE_PUBLIQUE);
      expect(ecrit).not.toContain(CLE_PRIVEE);
    });

    it('avertit au démarrage si une clé « live » est utilisée hors production', () => {
      const valeurs: Record<string, string> = {
        NOTCHPAY_PUBLIC_KEY: 'pk_live_SECRET',
        NOTCHPAY_PRIVATE_KEY: 'sk_live_SECRET',
        NODE_ENV: 'development',
      };
      new NotchPayClient({
        get: (nom: string) => valeurs[nom],
        getOrThrow: (nom: string) => valeurs[nom],
      } as unknown as ConfigService).onModuleInit();
      expect(avertissements).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(avertissements.mock.calls)).not.toContain('SECRET');

      avertissements.mockClear();
      client.onModuleInit(); // clés de test, NODE_ENV = test
      expect(avertissements).not.toHaveBeenCalled();
    });
  });
});
