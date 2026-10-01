import {
  VARIABLES_FRAIS,
  calculerFraisDon,
  tauxFrais,
} from './frais-transaction';

const NOMS = [
  ...Object.values(VARIABLES_FRAIS.encaissement),
  ...Object.values(VARIABLES_FRAIS.versement),
];

describe('calculerFraisDon', () => {
  // Tarifs par défaut (AangaraaPay), quel que soit l'environnement.
  beforeEach(() => {
    for (const nom of NOMS) delete process.env[nom];
  });
  afterAll(() => {
    for (const nom of NOMS) delete process.env[nom];
  });

  it.each([
    // donateur, retrait de l'organisateur, taux total, frais pour 1 000 XAF
    ['MTN_MOBILE_MONEY', 'MTN_MOBILE_MONEY', 3.0, 30],
    ['MTN_MOBILE_MONEY', 'ORANGE_MONEY', 3.8, 38],
    ['ORANGE_MONEY', 'MTN_MOBILE_MONEY', 2.8, 28],
    ['ORANGE_MONEY', 'ORANGE_MONEY', 3.6, 36],
  ] as const)(
    'donateur %s, retrait %s : %s %',
    (donateur, retrait, taux, frais) => {
      const resultat = calculerFraisDon(1000, donateur, retrait);
      expect(resultat).toEqual({
        montant_don: 1000,
        montant_frais: frais,
        montant_total: 1000 + frais,
        taux_encaissement: donateur === 'MTN_MOBILE_MONEY' ? 1.7 : 1.5,
        taux_versement: retrait === 'MTN_MOBILE_MONEY' ? 1.3 : 2.1,
      });
      expect(resultat.taux_encaissement + resultat.taux_versement).toBeCloseTo(
        taux,
      );
    },
  );

  it('arrondit toujours au franc CFA supérieur', () => {
    // 1 001 × 3,8 % = 38,038 → 39 ; 1 001 × 3 % = 30,03 → 31 ; 101 × 2,8 % = 2,828 → 3.
    expect(
      calculerFraisDon(1001, 'MTN_MOBILE_MONEY', 'ORANGE_MONEY').montant_frais,
    ).toBe(39);
    expect(
      calculerFraisDon(1001, 'MTN_MOBILE_MONEY', 'MTN_MOBILE_MONEY')
        .montant_frais,
    ).toBe(31);
    expect(
      calculerFraisDon(101, 'ORANGE_MONEY', 'MTN_MOBILE_MONEY').montant_frais,
    ).toBe(3);
    // Résultat exact : pas d'arrondi vers le haut parasite (erreurs des décimaux).
    expect(
      calculerFraisDon(5000, 'MTN_MOBILE_MONEY', 'ORANGE_MONEY').montant_frais,
    ).toBe(190);
    expect(
      calculerFraisDon(100, 'ORANGE_MONEY', 'MTN_MOBILE_MONEY').montant_frais,
    ).toBe(3); // 2,8 → 3
  });

  it('opérateur de retrait inconnu : taux de versement le plus élevé (Orange, 2,10 %)', () => {
    expect(calculerFraisDon(1000, 'MTN_MOBILE_MONEY', null)).toMatchObject({
      montant_frais: 38,
      taux_versement: 2.1,
    });
    expect(calculerFraisDon(1000, 'ORANGE_MONEY', null)).toMatchObject({
      montant_frais: 36,
      taux_versement: 2.1,
    });
  });

  it('suit les taux réglés par variables d’environnement, et ignore une valeur invalide', () => {
    process.env.FRAIS_MTN_ENCAISSEMENT_POURCENT = '2';
    process.env.FRAIS_MTN_VERSEMENT_POURCENT = '2.5';
    process.env.FRAIS_ORANGE_VERSEMENT_POURCENT = '1';
    expect(
      calculerFraisDon(1000, 'MTN_MOBILE_MONEY', 'MTN_MOBILE_MONEY')
        .montant_frais,
    ).toBe(45);
    // Inconnu : le plus élevé est maintenant celui de MTN (2,5 %).
    expect(calculerFraisDon(1000, 'MTN_MOBILE_MONEY', null).montant_frais).toBe(
      45,
    );
    process.env.FRAIS_ORANGE_ENCAISSEMENT_POURCENT = 'abc';
    expect(tauxFrais().encaissement.ORANGE_MONEY).toBe(1.5);
    process.env.FRAIS_MTN_ENCAISSEMENT_POURCENT = '0';
    process.env.FRAIS_MTN_VERSEMENT_POURCENT = '0';
    expect(
      calculerFraisDon(1000, 'MTN_MOBILE_MONEY', 'MTN_MOBILE_MONEY'),
    ).toMatchObject({ montant_frais: 0, montant_total: 1000 });
  });
});
