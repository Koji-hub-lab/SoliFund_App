// Les décorateurs de class-validator ont besoin de reflect-metadata (chargé par Nest en temps normal).
import 'reflect-metadata';
import { validerEnvironnement } from './env.validation';

// Configuration minimale valide, avec des clés Notch Pay de test.
const base = {
  DATABASE_URL: 'postgresql://u:m@localhost:5432/solifund',
  JWT_SECRET: 'x'.repeat(40),
  BREVO_API_KEY: 'cle',
  BREVO_SENDER_EMAIL: 'no-reply@solifund.test',
  FRONTEND_URL: 'http://localhost:5173',
  NOTCHPAY_PUBLIC_KEY: 'pk_test_abc',
  NOTCHPAY_PRIVATE_KEY: 'sk_test_abc',
};

describe('validerEnvironnement : fournisseur de paiement', () => {
  it('Notch Pay par défaut : ses clés sont obligatoires', () => {
    expect(() =>
      validerEnvironnement({ ...base, NOTCHPAY_PUBLIC_KEY: '' }),
    ).toThrow(/NOTCHPAY_PUBLIC_KEY : variable manquante/);
  });

  it('AangaraaPay : clé et URL publique obligatoires, clés Notch Pay facultatives', () => {
    const aangaraa = {
      ...base,
      PAIEMENT_FOURNISSEUR: 'aangaraa',
      NOTCHPAY_PUBLIC_KEY: '',
      NOTCHPAY_PRIVATE_KEY: '',
      AANGARAA_APP_KEY: 'cle-aangaraa',
      AANGARAA_WEBHOOK_JETON: 'j'.repeat(40),
      PUBLIC_API_URL: 'https://api.solifund.cm',
    };
    expect(() => validerEnvironnement(aangaraa)).not.toThrow();
    expect(() =>
      validerEnvironnement({ ...aangaraa, AANGARAA_WEBHOOK_JETON: '' }),
    ).toThrow(/AANGARAA_WEBHOOK_JETON : variable manquante/);
    expect(() =>
      validerEnvironnement({ ...aangaraa, AANGARAA_WEBHOOK_JETON: 'court' }),
    ).toThrow(/au moins 32 caractères/);
    expect(() =>
      validerEnvironnement({ ...aangaraa, AANGARAA_APP_KEY: '' }),
    ).toThrow(/AANGARAA_APP_KEY : variable manquante/);
    expect(() =>
      validerEnvironnement({ ...aangaraa, PUBLIC_API_URL: '' }),
    ).toThrow(/PUBLIC_API_URL : variable manquante/);
  });

  it('refuse un fournisseur inconnu', () => {
    expect(() =>
      validerEnvironnement({ ...base, PAIEMENT_FOURNISSEUR: 'autre' }),
    ).toThrow(/PAIEMENT_FOURNISSEUR doit valoir/);
  });
});

describe('validerEnvironnement : clés Notch Pay', () => {
  it('accepte des clés de test hors production', () => {
    expect(() => validerEnvironnement({ ...base })).not.toThrow();
    expect(() =>
      validerEnvironnement({ ...base, NODE_ENV: 'development' }),
    ).not.toThrow();
  });

  it('refuse de démarrer avec une clé « live » hors production, sans écrire la clé', () => {
    for (const NODE_ENV of [undefined, 'development', 'test']) {
      const demarrer = () =>
        validerEnvironnement({
          ...base,
          NODE_ENV,
          NOTCHPAY_PRIVATE_KEY: 'sk_live_SECRET',
        });
      expect(demarrer).toThrow(/Clé Notch Pay « live » hors production/);
      expect(demarrer).toThrow(/NOTCHPAY_PRIVATE_KEY/);
      expect(demarrer).not.toThrow(/SECRET/);
    }
    // Le hash du webhook compte aussi.
    expect(() =>
      validerEnvironnement({ ...base, NOTCHPAY_WEBHOOK_HASH: 'hsk_live_x' }),
    ).toThrow(/NOTCHPAY_WEBHOOK_HASH/);
  });

  it('démarre avec une clé « live » si NOTCHPAY_AUTORISER_LIVE_EN_DEV=true', () => {
    const live = { ...base, NOTCHPAY_PUBLIC_KEY: 'pk_live_x' };
    expect(() =>
      validerEnvironnement({ ...live, NOTCHPAY_AUTORISER_LIVE_EN_DEV: 'true' }),
    ).not.toThrow();
    expect(() =>
      validerEnvironnement({
        ...live,
        NOTCHPAY_AUTORISER_LIVE_EN_DEV: 'false',
      }),
    ).toThrow(/live/);
    expect(() =>
      validerEnvironnement({ ...live, NOTCHPAY_AUTORISER_LIVE_EN_DEV: '' }),
    ).toThrow(/live/);
  });

  it('démarre en production avec des clés « live » (hash du webhook exigé)', () => {
    const production = {
      ...base,
      NODE_ENV: 'production',
      NOTCHPAY_PUBLIC_KEY: 'pk_live_x',
      NOTCHPAY_PRIVATE_KEY: 'sk_live_x',
      PUBLIC_API_URL: 'https://api.solifund.cm',
    };
    expect(() =>
      validerEnvironnement({
        ...production,
        NOTCHPAY_WEBHOOK_HASH: 'hsk_live_x',
      }),
    ).not.toThrow();
    expect(() => validerEnvironnement(production)).toThrow(
      /NOTCHPAY_WEBHOOK_HASH/,
    );
  });
});

describe('validerEnvironnement : DON_MONTANT_MINIMUM', () => {
  it('facultatif ; un entier positif est accepté', () => {
    expect(() => validerEnvironnement({ ...base })).not.toThrow();
    expect(() =>
      validerEnvironnement({ ...base, DON_MONTANT_MINIMUM: '500' }),
    ).not.toThrow();
  });

  it('refuse une valeur non entière, nulle ou négative', () => {
    for (const valeur of ['abc', '10.5', '0', '-100']) {
      expect(() =>
        validerEnvironnement({ ...base, DON_MONTANT_MINIMUM: valeur }),
      ).toThrow(/DON_MONTANT_MINIMUM/);
    }
  });
});

describe('validerEnvironnement : PUBLIC_API_URL', () => {
  const production = {
    ...base,
    NODE_ENV: 'production',
    NOTCHPAY_PUBLIC_KEY: 'pk_live_abc',
    NOTCHPAY_PRIVATE_KEY: 'sk_live_abc',
    NOTCHPAY_WEBHOOK_HASH: 'hsk_live_abc',
  };

  it('obligatoire en production, quel que soit le fournisseur', () => {
    expect(() => validerEnvironnement(production)).toThrow(
      /PUBLIC_API_URL : variable manquante/,
    );
    expect(() =>
      validerEnvironnement({
        ...production,
        PUBLIC_API_URL: 'https://api.solifund.cm',
      }),
    ).not.toThrow();
  });

  it('facultative en développement avec Notch Pay', () => {
    expect(() => validerEnvironnement({ ...base })).not.toThrow();
  });
});

describe('validerEnvironnement : JWT_DUREE et TRUST_PROXY', () => {
  it('accepte une durée en secondes ou avec une unité, refuse le reste', () => {
    for (const duree of ['3600', '30m', '12h', '1d', '']) {
      expect(() =>
        validerEnvironnement({ ...base, JWT_DUREE: duree }),
      ).not.toThrow();
    }
    for (const duree of ['0', '1 jour', '1w', '-5', '1.5h']) {
      expect(() => validerEnvironnement({ ...base, JWT_DUREE: duree })).toThrow(
        /JWT_DUREE/,
      );
    }
  });

  it('TRUST_PROXY : nombre entier de proxys', () => {
    expect(() =>
      validerEnvironnement({ ...base, TRUST_PROXY: '1' }),
    ).not.toThrow();
    for (const valeur of ['-1', 'true', '1.5']) {
      expect(() =>
        validerEnvironnement({ ...base, TRUST_PROXY: valeur }),
      ).toThrow(/TRUST_PROXY/);
    }
  });
});
