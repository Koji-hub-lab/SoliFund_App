import { ConfigService } from '@nestjs/config';
import { operateurPourMethode } from './configuration-3spay';
import { messageErreur3SPay } from './messages-3spay';
import { normaliserNumero3SPay } from './numero-3spay';
import {
  convertirStatut3SPay,
  lireErreur3SPay,
  operateurDisponible,
} from './statuts-3spay';
import type { DetailTransaction3SPay, Transaction3SPay } from './types-3spay';

describe('normaliserNumero3SPay', () => {
  it.each([
    '699000000',
    '6 99 00 00 00',
    '699-000-000',
    '699.00.00.00',
    '(699) 000 000',
    '+237 699 00 00 00',
    '+237699000000',
    '00237699000000',
    '237699000000',
    ' 237 6 99 00 00 00 ',
  ])('« %s » → 237699000000', (saisie) => {
    expect(normaliserNumero3SPay(saisie)).toBe('237699000000');
  });

  it.each([
    '',
    '69900000', // 8 chiffres
    '6990000000', // 10 chiffres
    '222000000', // fixe (ne commence pas par 6)
    '+33612345678', // autre pays
    '237699000000123',
    '69900000a',
  ])('« %s » → null', (saisie) => {
    expect(normaliserNumero3SPay(saisie)).toBeNull();
  });
});

describe('operateurPourMethode', () => {
  it('MTN → mtn, Orange → intouch par défaut', () => {
    expect(operateurPourMethode('MTN_MOBILE_MONEY')).toBe('mtn');
    expect(operateurPourMethode('ORANGE_MONEY')).toBe('intouch');
  });

  it('suit la configuration, en ignorant un code inconnu', () => {
    const config = new ConfigService({
      TROISPAY_OPERATEUR_ORANGE: 'orange',
      TROISPAY_OPERATEUR_MTN: 'mnt',
    });
    expect(operateurPourMethode('ORANGE_MONEY', config)).toBe('orange');
    expect(operateurPourMethode('MTN_MOBILE_MONEY', config)).toBe('mtn');
  });
});

describe('convertirStatut3SPay', () => {
  it.each([
    ['initiated', 'EN_ATTENTE', false],
    ['pending', 'EN_ATTENTE', false],
    ['processing', 'EN_ATTENTE', false],
    ['confirmed', 'VALIDE', true],
    ['completed', 'VALIDE', true],
    ['failed', 'ECHOUE', true],
    ['expired', 'ECHOUE', true],
    ['cancelled', 'ECHOUE', true],
    ['reversed', 'ECHOUE', true],
    ['CONFIRMED', 'VALIDE', true],
  ])('%s → %s (terminal : %s)', (statut, attendu, terminal) => {
    expect(convertirStatut3SPay(statut)).toEqual({ statut: attendu, terminal });
  });

  it('un statut inconnu ou absent reste en attente, jamais échoué', () => {
    expect(convertirStatut3SPay('refunded')).toEqual({
      statut: 'EN_ATTENTE',
      terminal: false,
    });
    expect(convertirStatut3SPay(undefined)).toEqual({
      statut: 'EN_ATTENTE',
      terminal: false,
    });
  });
});

describe('lireErreur3SPay', () => {
  const base = {
    transaction_id: 't',
    status: 'failed',
    message: 'm',
    partner_reference: 'r',
    amount: 1,
    currency: 'XAF',
    created_at: 'x',
  };

  it('lit les champs d’une réponse de création', () => {
    const t: Transaction3SPay = {
      ...base,
      error_type: 'INSUFFICIENT_BALANCE',
      error_code: 'MCP_417',
      error_recoverable: true,
    };
    expect(lireErreur3SPay(t)).toEqual({
      error_type: 'INSUFFICIENT_BALANCE',
      error_code: 'MCP_417',
      error_recoverable: true,
    });
  });

  it('lit l’objet « error » d’une consultation, et déduit error_recoverable', () => {
    const t: DetailTransaction3SPay = {
      ...base,
      type: 'deposit',
      operator: 'mtn',
      error: { type: 'USER_REJECTED', code: 'R01' },
    };
    expect(lireErreur3SPay(t)).toEqual({
      error_type: 'USER_REJECTED',
      error_code: 'R01',
      error_recoverable: false,
    });

    const autre: DetailTransaction3SPay = {
      ...base,
      type: 'deposit',
      operator: 'mtn',
      error: { error_type: 'INVALID_PIN' },
    };
    expect(lireErreur3SPay(autre).error_recoverable).toBe(true);
  });

  it('sans erreur : tout est vide', () => {
    expect(lireErreur3SPay({ ...base, status: 'pending' })).toEqual({
      error_type: null,
      error_code: null,
      error_recoverable: false,
    });
  });
});

describe('messageErreur3SPay', () => {
  it.each([
    'INSUFFICIENT_BALANCE',
    'DAILY_LIMIT_REACHED',
    'ACCOUNT_BLOCKED',
    'INVALID_PIN',
    'OPERATOR_TIMEOUT',
    'NETWORK_ERROR',
    'USER_REJECTED',
    'INVALID_PHONE',
    'OPERATOR_REJECTED',
  ])('%s a un message propre', (type) => {
    const message = messageErreur3SPay(type);
    expect(message).not.toBe(messageErreur3SPay('OTHER'));
    expect(message).toMatch(/\.$/);
  });

  it('OTHER, inconnu ou absent : message général', () => {
    const general =
      "Le paiement n'a pas abouti. Réessayez ou utilisez un autre numéro.";
    expect(messageErreur3SPay('OTHER')).toBe(general);
    expect(messageErreur3SPay('NOUVEAU_CODE')).toBe(general);
    expect(messageErreur3SPay(null)).toBe(general);
  });

  it('vouvoie le donateur', () => {
    expect(messageErreur3SPay('INSUFFICIENT_BALANCE')).toMatch(
      /votre|Réessayez/,
    );
    expect(messageErreur3SPay('INVALID_PIN')).not.toMatch(/\bton\b|\btu\b/i);
  });
});

describe('operateurDisponible', () => {
  const liste = [
    { code: 'mtn_cm', disponible: true },
    { code: 'intouch', disponible: true },
    { code: 'orange', disponible: false },
  ];

  it('reconnaît les codes, avec ou sans suffixe pays', () => {
    expect(operateurDisponible(liste, 'mtn')).toBe(true);
    expect(operateurDisponible(liste, 'intouch')).toBe(true);
  });

  it('un opérateur inactif ou absent est indisponible', () => {
    expect(operateurDisponible(liste, 'orange')).toBe(false);
    expect(operateurDisponible(liste, 'mycoolpay')).toBe(false);
  });
});
