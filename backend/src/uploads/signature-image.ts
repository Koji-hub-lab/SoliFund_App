export type TypeImage = 'jpg' | 'png' | 'webp';

// Détecte le type réel d'une image à partir de ses premiers octets (signature), sans se fier au
// nom du fichier ni au type MIME déclaré par le client. null si ce n'est ni JPEG, ni PNG, ni WEBP.
export function detecterTypeImage(contenu: Buffer): TypeImage | null {
  if (
    contenu.length >= 3 &&
    contenu[0] === 0xff &&
    contenu[1] === 0xd8 &&
    contenu[2] === 0xff
  ) {
    return 'jpg';
  }
  const signaturePng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    contenu.length >= 8 &&
    signaturePng.every((octet, i) => contenu[i] === octet)
  ) {
    return 'png';
  }
  if (
    contenu.length >= 12 &&
    contenu.toString('ascii', 0, 4) === 'RIFF' &&
    contenu.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export const TYPES_MIME: Record<TypeImage, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
