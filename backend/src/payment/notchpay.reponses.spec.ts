import { readFileSync } from 'fs';
import { join } from 'path';
import { lirePaiement } from './notchpay.reponses';
import {
  codeErreurDepuisMessage,
  erreurMobileMoney,
  statutDepuisNotchPay,
} from './notchpay.utilitaires';

// Réponses réelles de Notch Pay, anonymisées (scripts/notchpay-exemples-echecs.ts).
function exemple(nom: string): unknown {
  const fichier = join(
    __dirname,
    '..',
    '..',
    '..',
    'docs',
    'paiement',
    'exemples',
    `${nom}.json`,
  );
  const contenu = JSON.parse(readFileSync(fichier, 'utf8')) as {
    reponses: { corps: unknown }[];
  };
  return contenu.reponses[0].corps;
}

describe('lecture des réponses réelles de Notch Pay', () => {
  it('paiement « failed » : statut, montant, devise et références, sans raison d’échec', () => {
    const paiement = lirePaiement(exemple('paiement-echoue-33'));
    expect(paiement).toMatchObject({
      reference: 'trx.OVWOdQ1ocvOgunk65YNkG7Az',
      referenceMarchand: 'SOLIFUND-DON-33',
      statut: 'failed',
      montant: 100,
      devise: 'XAF',
    });
    // payment_method (« pm.… ») n'est pas le canal.
    expect(paiement.canal).toBeUndefined();
    // Notch Pay ne donne aucune raison : le donateur reçoit le message générique.
    expect(paiement.codeErreur).toBeUndefined();
    expect(paiement.messageErreur).toBeUndefined();
    expect(statutDepuisNotchPay(paiement.statut)).toBe('ECHOUE');
    expect(erreurMobileMoney(paiement.codeErreur).code).toBeNull();
  });

  it('paiement refusé au traitement puis « expired »', () => {
    const paiement = lirePaiement(exemple('paiement-echoue-34'));
    expect(paiement).toMatchObject({
      referenceMarchand: 'SOLIFUND-DON-34',
      statut: 'expired',
    });
    expect(statutDepuisNotchPay(paiement.statut)).toBe('ECHOUE');
  });
});

describe('codeErreurDepuisMessage', () => {
  it.each([
    ['Invalid CM Mobile Money', 'INVALID_PHONE'], // réel (paiement-echoue-34)
    ['Invalid phone number', 'INVALID_PHONE'],
    ['Phone number not registered', 'UNREGISTERED_PHONE'],
    ['Insufficient funds', 'INSUFFICIENT_BALANCE'],
    // Réel (AangaraaPay, paiement MTN refusé) : pas confondu avec un solde ou une limite.
    [
      'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED',
      'LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED',
    ],
    ['Balance too low', 'INSUFFICIENT_BALANCE'],
    ['Transaction limit exceeded', 'TRANSACTION_LIMIT_EXCEEDED'],
    ['Cancelled by user', 'CANCELLED_BY_USER'],
    ['Request timed out', 'TIMEOUT'],
  ])('« %s » → %s', (message, code) => {
    expect(codeErreurDepuisMessage(message)).toBe(code);
  });

  it('ne devine rien pour un message inconnu', () => {
    expect(codeErreurDepuisMessage('Payment failed')).toBeUndefined();
    expect(codeErreurDepuisMessage('Validation failed')).toBeUndefined();
    expect(codeErreurDepuisMessage(undefined)).toBeUndefined();
  });
});
