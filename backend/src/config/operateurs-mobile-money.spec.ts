import { numeroIncoherent, operateurDuNumero } from './operateurs-mobile-money';

// Préfixes de la documentation AangaraaPay : MTN 650-654 et 670-683 ; Orange 655-659 et 690-699.
describe('opérateur d’un numéro camerounais', () => {
  it.each([
    ['650000000', 'MTN_MOBILE_MONEY'],
    ['654999999', 'MTN_MOBILE_MONEY'],
    ['670000000', 'MTN_MOBILE_MONEY'],
    ['677123456', 'MTN_MOBILE_MONEY'],
    ['671227510', 'MTN_MOBILE_MONEY'],
    ['679999999', 'MTN_MOBILE_MONEY'],
    ['680000000', 'MTN_MOBILE_MONEY'],
    ['683999999', 'MTN_MOBILE_MONEY'],
    ['655000000', 'ORANGE_MONEY'],
    ['659999999', 'ORANGE_MONEY'],
    ['690000000', 'ORANGE_MONEY'],
    ['699415795', 'ORANGE_MONEY'],
    // Toutes les écritures acceptées à la saisie
    ['+237677123456', 'MTN_MOBILE_MONEY'],
    ['237 699 41 57 95', 'ORANGE_MONEY'],
    ['00237-655-00-00-00', 'ORANGE_MONEY'],
    ['6 81 00 00 00', 'MTN_MOBILE_MONEY'],
  ])('%s → %s', (numero, operateur) => {
    expect(operateurDuNumero(numero)).toBe(operateur);
  });

  it.each([
    ['684000000'], // hors des listes de la documentation
    ['686000000'],
    ['689000000'],
    ['662000000'],
    ['620000000'],
    ['222334455'],
    [''],
  ])('préfixe inconnu : %s → null', (numero) => {
    expect(operateurDuNumero(numero)).toBeNull();
  });

  it('signale l’opérateur réel quand il ne correspond pas au choix', () => {
    expect(numeroIncoherent('699415795', 'MTN_MOBILE_MONEY')).toBe(
      'ORANGE_MONEY',
    );
    expect(numeroIncoherent('681000000', 'ORANGE_MONEY')).toBe(
      'MTN_MOBILE_MONEY',
    );
    expect(numeroIncoherent('699415795', 'ORANGE_MONEY')).toBeNull();
    expect(numeroIncoherent('677123456', 'MTN_MOBILE_MONEY')).toBeNull();
    // Préfixe inconnu : jamais incohérent.
    expect(numeroIncoherent('686000000', 'MTN_MOBILE_MONEY')).toBeNull();
  });
});
