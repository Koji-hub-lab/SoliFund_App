import { traduireTexte } from '../i18n/messages';
import { avertissementsCles, estCleDeTest } from './notchpay.config';
import {
  canalNotchPay,
  erreurMobileMoney,
  estStatutFinal,
  genererReference,
  normaliserNumero,
  statutDepuisNotchPay,
} from './notchpay.utilitaires';

describe('normaliserNumero', () => {
  it.each([
    ['677123456', '+237677123456'],
    ['6 77 12 34 56', '+237677123456'],
    ['677-12-34-56', '+237677123456'],
    ['677.12.34.56', '+237677123456'],
    ['237677123456', '+237677123456'],
    ['+237677123456', '+237677123456'],
    ['+237 6 77 12 34 56', '+237677123456'],
    ['00237677123456', '+237677123456'],
    ['+237670000000', '+237670000000'], // numéro de test MTN
    ['690000004', '+237690000004'], // numéro de test Orange
  ])('%s → %s', (saisie, attendu) => {
    expect(normaliserNumero(saisie)).toBe(attendu);
  });

  it.each([
    [''],
    ['77123456'], // 8 chiffres
    ['6771234567'], // 10 chiffres
    ['277123456'], // ne commence pas par 6
    ['+33677123456'], // autre pays
    ['23767712345'], // indicatif puis 8 chiffres
    ['6771234ab'],
  ])('refuse %s', (saisie) => {
    expect(normaliserNumero(saisie)).toBeNull();
  });
});

describe('canalNotchPay', () => {
  it('fait correspondre chaque méthode à son canal', () => {
    expect(canalNotchPay('MTN_MOBILE_MONEY')).toBe('cm.mtn');
    expect(canalNotchPay('ORANGE_MONEY')).toBe('cm.orange');
  });
});

describe('statutDepuisNotchPay', () => {
  it.each([
    ['complete', 'VALIDE'],
    ['Complete', 'VALIDE'],
    ['completed', 'VALIDE'],
    ['failed', 'ECHOUE'],
    ['canceled', 'ECHOUE'],
    ['cancelled', 'ECHOUE'],
    ['expired', 'ECHOUE'],
    ['rejected', 'ECHOUE'],
    ['abandoned', 'ECHOUE'],
    ['reversed', 'ECHOUE'],
    ['pending', 'EN_ATTENTE'],
    ['processing', 'EN_ATTENTE'],
    ['sent', 'EN_ATTENTE'],
    ['incomplete', 'EN_ATTENTE'],
  ])('%s → %s', (statut, attendu) => {
    expect(statutDepuisNotchPay(statut)).toBe(attendu);
  });

  it('traite un statut inconnu comme « en attente » : jamais validé, jamais échoué', () => {
    expect(statutDepuisNotchPay('statut-inconnu')).toBe('EN_ATTENTE');
    expect(estStatutFinal('statut-inconnu')).toBe(false);
    expect(estStatutFinal('complete')).toBe(true);
    expect(estStatutFinal('failed')).toBe(true);
    expect(estStatutFinal('processing')).toBe(false);
  });
});

describe('erreurMobileMoney', () => {
  const CODES = [
    'INVALID_PHONE',
    'UNREGISTERED_PHONE',
    'INSUFFICIENT_BALANCE',
    'TRANSACTION_LIMIT_EXCEEDED',
    'TIMEOUT',
    'PROVIDER_ERROR',
    'CANCELLED_BY_USER',
    'DUPLICATE_TRANSACTION',
    'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED',
  ];

  it.each(CODES)('%s a un message en français, au vouvoiement', (code) => {
    const erreur = erreurMobileMoney(code);
    expect(erreur.code).toBe(code);
    const message = traduireTexte('fr', erreur.message);
    expect(message).not.toContain('i18n'); // message traduit, pas une clé
    expect(message).toMatch(/\b(vous|votre|vos|vérifiez|essayez|veuillez)\b/i);
    expect(message).not.toMatch(/\b(tu|ton|ta|tes)\b/i);
    // Le message anglais existe aussi.
    expect(traduireTexte('en', erreur.message)).not.toBe(message);
  });

  it('indique si le donateur peut réessayer', () => {
    const reessayer = (code: string) => erreurMobileMoney(code).peutReessayer;
    expect(reessayer('INSUFFICIENT_BALANCE')).toBe(true);
    expect(reessayer('TIMEOUT')).toBe(true);
    expect(reessayer('PROVIDER_ERROR')).toBe(true);
    expect(reessayer('CANCELLED_BY_USER')).toBe(true);
    expect(reessayer('LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED')).toBe(
      true,
    );
    expect(reessayer('INVALID_PHONE')).toBe(false);
    expect(reessayer('UNREGISTERED_PHONE')).toBe(false);
    expect(reessayer('TRANSACTION_LIMIT_EXCEEDED')).toBe(false);
    expect(reessayer('DUPLICATE_TRANSACTION')).toBe(false);
  });

  it('accepte le code en minuscules et donne un message générique pour un code inconnu', () => {
    expect(erreurMobileMoney('insufficient_balance').code).toBe(
      'INSUFFICIENT_BALANCE',
    );
    for (const code of ['AUTRE_CODE', '', undefined, null]) {
      const erreur = erreurMobileMoney(code);
      expect(erreur.code).toBeNull();
      expect(erreur.peutReessayer).toBe(true);
      expect(traduireTexte('fr', erreur.message)).toBe(
        "Le paiement n'a pas abouti. Aucun montant n'a été débité. Veuillez réessayer.",
      );
    }
  });
});

describe('genererReference', () => {
  it('produit des références uniques au format SLF-<type>-<date>-<aléa>', () => {
    const references = Array.from({ length: 200 }, () =>
      genererReference('DON'),
    );
    expect(new Set(references).size).toBe(200);
    expect(references[0]).toMatch(/^SLF-DON-\d{8}-[0-9A-F]{10}$/);
    expect(genererReference('RETRAIT')).toMatch(/^SLF-RETRAIT-/);
  });
});

describe('clés Notch Pay', () => {
  it('reconnaît les clés de test', () => {
    expect(estCleDeTest('pk_test_123456789')).toBe(true);
    expect(estCleDeTest('sk_test.abcdef')).toBe(true);
    expect(estCleDeTest('hsk_test_abc')).toBe(true);
    expect(estCleDeTest('pk_live_123456789')).toBe(false);
    expect(estCleDeTest('pk.abcdef')).toBe(false);
    expect(estCleDeTest('sk_contest_123')).toBe(false);
  });

  const cles = (publique: string, privee: string) => [
    { nom: 'NOTCHPAY_PUBLIC_KEY', valeur: publique },
    { nom: 'NOTCHPAY_PRIVATE_KEY', valeur: privee },
    { nom: 'NOTCHPAY_WEBHOOK_HASH', valeur: undefined },
  ];

  it('n’avertit pas quand les clés correspondent à l’environnement', () => {
    expect(
      avertissementsCles(cles('pk_test_a', 'sk_test_b'), 'development'),
    ).toEqual([]);
    expect(
      avertissementsCles(cles('pk_test_a', 'sk_test_b'), undefined),
    ).toEqual([]);
    expect(
      avertissementsCles(cles('pk_live_a', 'sk_live_b'), 'production'),
    ).toEqual([]);
  });

  it('avertit pour une clé « live » hors production, sans écrire la clé', () => {
    const avertissements = avertissementsCles(
      cles('pk_live_SECRET', 'sk_live_SECRET'),
      'development',
    );
    expect(avertissements).toHaveLength(2);
    expect(avertissements[0]).toContain('NOTCHPAY_PUBLIC_KEY');
    expect(avertissements[0]).toContain('live');
    expect(avertissements.join(' ')).not.toContain('SECRET');
  });

  it('avertit pour une clé de test en production, et pour des clés de modes différents', () => {
    expect(
      avertissementsCles(cles('pk_test_a', 'sk_test_b'), 'production'),
    ).toHaveLength(2);
    const melange = avertissementsCles(
      cles('pk_test_a', 'sk_live_b'),
      'development',
    );
    expect(melange.some((a) => a.includes('même mode'))).toBe(true);
  });
});
