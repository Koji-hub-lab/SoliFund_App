import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { detecterTypeImage, TypeImage, TYPES_MIME } from './signature-image';
import { m } from '../i18n/messages';

// Dossier du stockage privé : hors de uploads/, jamais servi en statique, ignoré par git.
// STOCKAGE_PRIVE_DIR permet de le déplacer (volume persistant en production, dossier temporaire
// dans les tests).
function dossierRacine(): string {
  return (
    process.env.STOCKAGE_PRIVE_DIR || join(process.cwd(), 'stockage-prive')
  );
}

// Fichiers confidentiels (pièces d'identité) : écrits sous un nom aléatoire, lus uniquement par
// le code (flux), après contrôle des droits par l'appelant.
@Injectable()
export class StockagePriveService {
  private readonly logger = new Logger(StockagePriveService.name);

  // Vérifie que le contenu est une image JPEG, PNG ou WEBP (signature des premiers octets) et
  // l'écrit tel quel dans <stockage privé>/<sousDossier>/<uuid>.<ext>. Renvoie le nom du fichier.
  async enregistrerImage(
    contenu: Buffer | undefined,
    sousDossier: string,
    fichier: 'recto' | 'verso' | 'selfie',
  ): Promise<string> {
    if (!contenu?.length) {
      throw new BadRequestException(
        m('fichiers.manquant', { fichier: { cle: `fichiers.${fichier}` } }),
      );
    }
    const type = detecterTypeImage(contenu);
    if (!type) {
      throw new BadRequestException(
        m('fichiers.formatRefuse', {
          fichier: { cle: `fichiers.${fichier}` },
        }),
      );
    }
    const nom = `${randomUUID()}.${type}`;
    const dossier = join(dossierRacine(), sousDossier);
    await mkdir(dossier, { recursive: true });
    await writeFile(join(dossier, nom), contenu, { mode: 0o600 });
    return nom;
  }

  // Ouvre un fichier en lecture. null s'il n'existe plus.
  async lire(
    nom: string,
    sousDossier: string,
  ): Promise<{ flux: ReadStream; typeMime: string } | null> {
    const chemin = this.chemin(nom, sousDossier);
    if (!chemin) return null;
    try {
      await access(chemin);
    } catch {
      return null;
    }
    const extension = nom.split('.').pop() as TypeImage;
    return {
      flux: createReadStream(chemin),
      typeMime: TYPES_MIME[extension] ?? 'application/octet-stream',
    };
  }

  async supprimer(
    sousDossier: string,
    ...noms: (string | null | undefined)[]
  ): Promise<void> {
    for (const nom of noms) {
      const chemin = nom ? this.chemin(nom, sousDossier) : null;
      if (!chemin) continue;
      try {
        await unlink(chemin);
      } catch (e) {
        const erreur = e as NodeJS.ErrnoException;
        if (erreur.code !== 'ENOENT') {
          this.logger.warn(
            `Impossible de supprimer un fichier privé (${sousDossier}) : ${erreur.message}`,
          );
        }
      }
    }
  }

  // Refuse tout nom contenant un chemin (« .. », sous-dossier) : seuls les noms générés ici passent.
  private chemin(nom: string, sousDossier: string): string | null {
    if (!nom || basename(nom) !== nom) return null;
    return join(dossierRacine(), sousDossier, nom);
  }
}
