import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client3SPay } from './client-3spay.service';
import { Erreur3SPay } from './erreur-3spay';

const CLE_API = 'cle-api-secrete-123';
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const DEPOT = {
  partner_reference: 'SOLIFUND-DON-1',
  amount: 5000,
  phone_number: '237699000000',
  operator: 'mtn',
};
const TRANSACTION = {
  transaction_id: 'a1b2c3d4',
  status: 'pending',
  message: 'Transaction sent to operator, awaiting confirmation',
  partner_reference: 'SOLIFUND-DON-1',
  amount: 5000,
  currency: 'XAF',
  created_at: '2026-09-30T10:00:00',
};

function reponse(
  statut: number,
  corps?: unknown,
  entetes: Record<string, string> = {},
) {
  return new Response(corps === undefined ? '' : JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json', ...entetes },
  });
}

describe('Client3SPay', () => {
  let fetchSimule: jest.SpyInstance<
    Promise<Response>,
    Parameters<typeof fetch>
  >;
  let attentes: number[];
  let client: Client3SPay;
  let journaux: string[];

  beforeEach(() => {
    fetchSimule = jest.spyOn(globalThis, 'fetch');
    attentes = [];
    journaux = [];
    for (const niveau of ['log', 'warn', 'error'] as const) {
      jest
        .spyOn(Logger.prototype, niveau)
        .mockImplementation((message: unknown) => {
          journaux.push(String(message));
        });
    }
    const config = new ConfigService({
      TROISPAY_API_URL: 'https://3spay.test/',
      TROISPAY_API_KEY: CLE_API,
      TROISPAY_PARTNER_ID: 'PARTENAIRE-1',
    });
    client = new Client3SPay(config, (ms) => {
      attentes.push(ms);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function appel(numero: number) {
    const [url, init] = fetchSimule.mock.calls[numero];
    return {
      url:
        typeof url === 'string' ? url : url instanceof URL ? url.href : url.url,
      init: init!,
      entetes: init!.headers as Record<string, string>,
    };
  }

  it('envoie apikey, X-Partner-Id, X-Request-Id (UUID) et X-Idempotency-Key sur une création', async () => {
    fetchSimule.mockResolvedValueOnce(reponse(201, TRANSACTION));

    const resultat = await client.creerDepot(DEPOT, 'cle-idem-1');

    expect(resultat).toEqual(TRANSACTION);
    const { url, init, entetes } = appel(0);
    expect(url).toBe('https://3spay.test/api/v1/deposits');
    expect(init.method).toBe('POST');
    expect(entetes.apikey).toBe(CLE_API);
    expect(entetes['X-Partner-Id']).toBe('PARTENAIRE-1');
    expect(entetes['X-Request-Id']).toMatch(UUID);
    expect(entetes['X-Idempotency-Key']).toBe('cle-idem-1');
    expect(JSON.parse(init.body as string)).toEqual({
      currency: 'XAF',
      ...DEPOT,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('n’envoie pas de clé d’idempotence sur une consultation', async () => {
    fetchSimule.mockResolvedValueOnce(
      reponse(200, { ...TRANSACTION, type: 'deposit', operator: 'mtn' }),
    );

    await client.consulterTransaction('a1b2 c3d4');

    const { url, init, entetes } = appel(0);
    expect(url).toBe('https://3spay.test/api/v1/transactions/a1b2%20c3d4');
    expect(init.method).toBe('GET');
    expect(entetes).not.toHaveProperty('X-Idempotency-Key');
    expect(entetes.apikey).toBe(CLE_API);
  });

  it('appelle les bonnes routes : versement, référence partenaire, solde, opérateurs', async () => {
    fetchSimule
      .mockResolvedValueOnce(reponse(201, TRANSACTION))
      .mockResolvedValueOnce(reponse(200, TRANSACTION))
      .mockResolvedValueOnce(
        reponse(200, {
          partner_id: 'P',
          balance: 1,
          available_balance: 1,
          hold_balance: 0,
          currency: 'XAF',
        }),
      )
      .mockResolvedValueOnce(
        reponse(200, {
          operators: ['mtn', 'intouch'],
          count: 2,
          timestamp: 'x',
        }),
      );

    await client.creerVersement(
      { ...DEPOT, reason: 'Retrait' },
      'cle-versement',
    );
    await client.consulterParReference('SOLIFUND-DON-1');
    await client.consulterSolde();
    await client.listerOperateurs();

    expect(appel(0).url).toBe('https://3spay.test/api/v1/payouts');
    expect(appel(0).entetes['X-Idempotency-Key']).toBe('cle-versement');
    expect(appel(1).url).toBe(
      'https://3spay.test/api/v1/transactions/by-partner-ref/SOLIFUND-DON-1',
    );
    expect(appel(2).url).toBe('https://3spay.test/api/v1/balance');
    expect(appel(3).url).toBe('https://3spay.test/api/v1/operators');
  });

  it('génère un X-Request-Id différent à chaque essai, et garde la même clé d’idempotence', async () => {
    fetchSimule
      .mockResolvedValueOnce(
        reponse(502, { code: 502, message: 'Opérateur injoignable' }),
      )
      .mockResolvedValueOnce(reponse(201, TRANSACTION));

    await client.creerDepot(DEPOT, 'cle-idem-2');

    expect(appel(0).entetes['X-Request-Id']).not.toBe(
      appel(1).entetes['X-Request-Id'],
    );
    expect(appel(0).entetes['X-Idempotency-Key']).toBe('cle-idem-2');
    expect(appel(1).entetes['X-Idempotency-Key']).toBe('cle-idem-2');
  });

  it('refuse une création sans clé d’idempotence', async () => {
    await expect(client.creerDepot(DEPOT, '')).rejects.toThrow('idempotence');
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it('409 : réessaie après quelques secondes, 3 fois au plus', async () => {
    fetchSimule
      .mockResolvedValueOnce(reponse(409, { code: 409, message: 'En cours' }))
      .mockResolvedValueOnce(reponse(409, { code: 409, message: 'En cours' }))
      .mockResolvedValueOnce(reponse(200, TRANSACTION));

    await expect(client.creerDepot(DEPOT, 'cle')).resolves.toEqual(TRANSACTION);
    expect(fetchSimule).toHaveBeenCalledTimes(3);
    expect(attentes).toEqual([3000, 3000]);
  });

  it('409 persistant : erreur temporaire après 3 nouveaux essais', async () => {
    fetchSimule.mockImplementation(() =>
      Promise.resolve(
        reponse(409, { code: 409, message: 'En cours', request_id: 'req-409' }),
      ),
    );

    const erreur = await client
      .creerDepot(DEPOT, 'cle')
      .catch((e: unknown) => e);

    expect(fetchSimule).toHaveBeenCalledTimes(4);
    expect(erreur).toBeInstanceOf(Erreur3SPay);
    expect(erreur).toMatchObject({
      temporaire: true,
      statutHttp: 409,
      requestId: 'req-409',
    });
  });

  it.each([429, 502, 503])(
    '%i : nouveaux essais à délai croissant',
    async (statut) => {
      fetchSimule
        .mockResolvedValueOnce(
          reponse(statut, { code: statut, message: 'Indisponible' }),
        )
        .mockResolvedValueOnce(
          reponse(statut, { code: statut, message: 'Indisponible' }),
        )
        .mockResolvedValueOnce(reponse(201, TRANSACTION));

      await expect(client.creerDepot(DEPOT, 'cle')).resolves.toEqual(
        TRANSACTION,
      );
      expect(attentes).toEqual([1000, 2000]);
    },
  );

  it('429 : respecte Retry-After s’il est plus long', async () => {
    fetchSimule
      .mockResolvedValueOnce(
        reponse(
          429,
          { code: 429, message: 'Trop de requêtes' },
          { 'Retry-After': '5' },
        ),
      )
      .mockResolvedValueOnce(reponse(201, TRANSACTION));

    await client.creerDepot(DEPOT, 'cle');
    expect(attentes).toEqual([5000]);
  });

  it('503 persistant : erreur temporaire après 3 nouveaux essais (1 s, 2 s, 4 s)', async () => {
    fetchSimule.mockImplementation(() =>
      Promise.resolve(
        reponse(503, { code: 503, message: 'Base indisponible' }),
      ),
    );

    const erreur = await client.consulterSolde().catch((e: unknown) => e);

    expect(fetchSimule).toHaveBeenCalledTimes(4);
    expect(attentes).toEqual([1000, 2000, 4000]);
    expect(erreur).toMatchObject({ temporaire: true, statutHttp: 503 });
  });

  it.each([400, 401, 404, 422])(
    '%i : erreur définitive, sans nouvel essai',
    async (statut) => {
      fetchSimule.mockResolvedValueOnce(
        reponse(statut, {
          code: statut,
          message: 'Refusé',
          request_id: 'req-def',
        }),
      );

      const erreur = await client
        .creerDepot(DEPOT, 'cle')
        .catch((e: unknown) => e);

      expect(fetchSimule).toHaveBeenCalledTimes(1);
      expect(attentes).toEqual([]);
      expect(erreur).toMatchObject({
        temporaire: false,
        statutHttp: statut,
        requestId: 'req-def',
        message: 'Refusé',
      });
    },
  );

  it('422 : reprend le détail des champs refusés dans le message', async () => {
    fetchSimule.mockResolvedValueOnce(
      reponse(422, {
        detail: [
          { loc: ['body', 'amount'], msg: 'doit être positif', type: 'x' },
        ],
      }),
    );

    await expect(client.creerDepot(DEPOT, 'cle')).rejects.toThrow(
      'body.amount : doit être positif',
    );
  });

  it('délai dépassé ou réseau : nouveaux essais, puis erreur temporaire', async () => {
    const delaiDepasse = new Error('The operation was aborted due to timeout');
    delaiDepasse.name = 'TimeoutError';
    fetchSimule
      .mockRejectedValueOnce(delaiDepasse)
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(delaiDepasse)
      .mockRejectedValueOnce(delaiDepasse);

    const erreur = await client
      .creerDepot(DEPOT, 'cle')
      .catch((e: unknown) => e);

    expect(fetchSimule).toHaveBeenCalledTimes(4);
    expect(erreur).toMatchObject({ temporaire: true, statutHttp: null });
    expect((erreur as Error).message).toContain('délai de 30 s dépassé');
  });

  it('écrit le request_id dans les journaux, jamais la clé d’API', async () => {
    fetchSimule
      .mockResolvedValueOnce(
        reponse(502, { code: 502, message: 'KO', request_id: 'req-journal-1' }),
      )
      .mockResolvedValueOnce(
        reponse(400, {
          code: 400,
          message: 'Numéro invalide',
          request_id: 'req-journal-2',
        }),
      );

    await client.creerDepot(DEPOT, 'cle').catch(() => undefined);

    const tout = journaux.join('\n');
    expect(tout).toContain('request_id=req-journal-1');
    expect(tout).toContain('request_id=req-journal-2');
    expect(tout).not.toContain(CLE_API);
  });

  it('normalise la liste des opérateurs (chaînes ou objets)', async () => {
    fetchSimule.mockResolvedValueOnce(
      reponse(200, {
        operators: [
          'mtn',
          { code: 'intouch', enabled: true },
          { code: 'orange', status: 'disabled' },
          { name: 'mycoolpay', configured: false },
          42,
        ],
        count: 4,
        timestamp: 'x',
      }),
    );

    expect(await client.listerOperateurs()).toEqual([
      { code: 'mtn', disponible: true },
      { code: 'intouch', disponible: true },
      { code: 'orange', disponible: false },
      { code: 'mycoolpay', disponible: false },
    ]);
  });
});
