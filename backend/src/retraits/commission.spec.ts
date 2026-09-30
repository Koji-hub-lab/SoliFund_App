import { ConfigService } from '@nestjs/config';
import { calculerCommission, tauxCommission } from './commission';

describe('calculerCommission', () => {
  it.each([
    // brut, taux, commission, net
    [10000, 3, 300, 9700],
    [100, 3, 3, 97],
    [150, 3, 5, 145], // 4,5 → arrondi à 5
    [149, 3, 4, 145], // 4,47 → 4
    [183, 3, 5, 178], // 5,49 → 5
    [184, 3, 6, 178], // 5,52 → 6
    [1010, 2.5, 25, 985], // 25,25 → 25
    [1020, 2.5, 26, 994], // 25,5 → 26
    [500000, 3, 15000, 485000],
    [10000, 0, 0, 10000],
  ])(
    '%i XAF à %s %% → commission %i, net %i',
    (brut, taux, commission, net) => {
      expect(calculerCommission(brut, taux)).toEqual({
        montant_commission: commission,
        montant_net: net,
      });
    },
  );

  it('net + commission = brut, et la commission est toujours entière', () => {
    for (const brut of [101, 333, 999, 12345, 499999]) {
      const { montant_commission, montant_net } = calculerCommission(brut, 3);
      expect(Number.isInteger(montant_commission)).toBe(true);
      expect(montant_commission + montant_net).toBe(brut);
    }
  });
});

describe('tauxCommission', () => {
  const taux = (valeur?: string) =>
    tauxCommission(
      new ConfigService(
        valeur === undefined ? {} : { COMMISSION_TAUX_POURCENT: valeur },
      ),
    );

  it('lit le taux configuré, 3 % par défaut', () => {
    expect(taux('5')).toBe(5);
    expect(taux('2.5')).toBe(2.5);
    expect(taux('0')).toBe(0);
    expect(taux()).toBe(3);
  });

  it('ignore une valeur invalide', () => {
    expect(taux('abc')).toBe(3);
    expect(taux('-1')).toBe(3);
    expect(taux('150')).toBe(3);
  });
});
