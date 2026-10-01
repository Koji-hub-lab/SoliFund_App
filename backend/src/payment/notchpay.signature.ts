import { createHmac, timingSafeEqual } from 'crypto';

// Signature d'un webhook Notch Pay : HMAC-SHA256 du corps BRUT de la requête (les octets reçus,
// jamais un JSON re-sérialisé), en hexadécimal, avec le hash du webhook (NOTCHPAY_WEBHOOK_HASH).
export function signerCorps(corpsBrut: Buffer | string, hash: string): string {
  return createHmac('sha256', hash).update(corpsBrut).digest('hex');
}

// Vrai seulement si l'en-tête x-notch-signature correspond au corps reçu. Faux si le hash n'est
// pas configuré, si la signature est absente ou si le corps est vide. La comparaison se fait en
// temps constant, après avoir vérifié que les longueurs sont égales (timingSafeEqual l'exige).
export function signatureValide(
  corpsBrut: Buffer | undefined,
  signature: unknown,
  hash: string | undefined,
): boolean {
  if (!hash || !corpsBrut?.length || typeof signature !== 'string') {
    return false;
  }
  const attendue = Buffer.from(signerCorps(corpsBrut, hash), 'utf8');
  const recue = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  return attendue.length === recue.length && timingSafeEqual(attendue, recue);
}
