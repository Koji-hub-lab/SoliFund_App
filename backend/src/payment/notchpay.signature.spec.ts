import { signatureValide, signerCorps } from './notchpay.signature';

describe('signature des webhooks Notch Pay', () => {
  const hash = 'hsk_test_secret';
  const corps = Buffer.from('{"id":"evt_1","type":"payment.complete"}');

  it('accepte la signature HMAC-SHA256 hexadécimale du corps brut', () => {
    const signature = signerCorps(corps, hash);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(signatureValide(corps, signature, hash)).toBe(true);
    expect(signatureValide(corps, signature.toUpperCase(), hash)).toBe(true);
  });

  it('refuse une signature calculée sur d’autres octets, même pour le même JSON', () => {
    const autre = Buffer.from('{ "id": "evt_1", "type": "payment.complete" }');
    expect(signatureValide(autre, signerCorps(corps, hash), hash)).toBe(false);
  });

  it('refuse une signature absente, invalide ou de mauvaise longueur', () => {
    expect(signatureValide(corps, undefined, hash)).toBe(false);
    expect(signatureValide(corps, '', hash)).toBe(false);
    expect(signatureValide(corps, 'abc', hash)).toBe(false);
    expect(signatureValide(corps, 'a'.repeat(64), hash)).toBe(false);
    expect(signatureValide(corps, ['x'], hash)).toBe(false);
    expect(signatureValide(corps, signerCorps(corps, 'autre-hash'), hash)).toBe(
      false,
    );
  });

  it('refuse tout quand le hash n’est pas configuré ou que le corps est vide', () => {
    const signature = signerCorps(corps, hash);
    expect(signatureValide(corps, signature, undefined)).toBe(false);
    expect(signatureValide(corps, signerCorps(corps, ''), '')).toBe(false);
    expect(signatureValide(undefined, signature, hash)).toBe(false);
    expect(signatureValide(Buffer.alloc(0), signature, hash)).toBe(false);
  });
});
