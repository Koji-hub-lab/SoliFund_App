import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import sharp from 'sharp';
import { detecterTypeImage } from './signature-image';
import { m } from '../i18n/messages';

const DOSSIER_UPLOADS = join(process.cwd(), 'uploads');
const PREFIXE_PUBLIC = '/uploads';

// Largeurs générées : page de la cagnotte, et cartes / miniatures.
const LARGEUR_IMAGE = 1200;
const LARGEUR_MINIATURE = 400;
const QUALITE_WEBP = 80;

// Chemins publics des deux versions d'une image (ex. /uploads/cagnottes/<uuid>.webp).
export type ImagesEnregistrees = { image: string; image_miniature: string };

// Convertit en WebP à la largeur donnée (sans agrandir une image plus petite). rotate() applique
// l'orientation de l'appareil photo ; les métadonnées (EXIF, position GPS...) ne sont pas recopiées.
function convertirEnWebp(contenu: Buffer, largeur: number): Promise<Buffer> {
  return sharp(contenu)
    .rotate()
    .resize({ width: largeur, withoutEnlargement: true })
    .webp({ quality: QUALITE_WEBP })
    .toBuffer();
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  // Vérifie le fichier envoyé puis l'enregistre en deux versions WebP (voir enregistrerContenu).
  async enregistrer(
    fichier: Express.Multer.File | undefined,
    sousDossier: string,
  ): Promise<ImagesEnregistrees> {
    if (!fichier || !fichier.buffer?.length) {
      throw new BadRequestException(m('images.aucunFichier'));
    }
    return this.enregistrerContenu(fichier.buffer, sousDossier);
  }

  // Écrit dans uploads/<sousDossier>/ une image de 1200 px et une miniature de 400 px, en WebP,
  // sous un nom aléatoire. Utilisé aussi par scripts/convertir-images.ts.
  async enregistrerContenu(
    contenu: Buffer,
    sousDossier: string,
  ): Promise<ImagesEnregistrees> {
    if (detecterTypeImage(contenu) === null) {
      throw new BadRequestException(m('images.formatRefuse'));
    }

    let image: Buffer;
    let miniature: Buffer;
    try {
      [image, miniature] = await Promise.all([
        convertirEnWebp(contenu, LARGEUR_IMAGE),
        convertirEnWebp(contenu, LARGEUR_MINIATURE),
      ]);
    } catch {
      throw new BadRequestException(m('images.illisible'));
    }

    const nom = randomUUID();
    const dossier = join(DOSSIER_UPLOADS, sousDossier);
    await mkdir(dossier, { recursive: true });
    await Promise.all([
      writeFile(join(dossier, `${nom}.webp`), image),
      writeFile(join(dossier, `${nom}-${LARGEUR_MINIATURE}.webp`), miniature),
    ]);
    return {
      image: `${PREFIXE_PUBLIC}/${sousDossier}/${nom}.webp`,
      image_miniature: `${PREFIXE_PUBLIC}/${sousDossier}/${nom}-${LARGEUR_MINIATURE}.webp`,
    };
  }

  // Supprime les images données à partir de leurs chemins publics. Ignore les chemins vides, ceux
  // qui ne pointent pas vers uploads/<sousDossier>/ et les fichiers déjà absents.
  async supprimer(
    sousDossier: string,
    ...cheminsPublics: (string | null | undefined)[]
  ): Promise<void> {
    await Promise.all(
      cheminsPublics.map((chemin) => this.supprimerUne(chemin, sousDossier)),
    );
  }

  private async supprimerUne(
    cheminPublic: string | null | undefined,
    sousDossier: string,
  ): Promise<void> {
    const prefixe = `${PREFIXE_PUBLIC}/${sousDossier}/`;
    if (!cheminPublic?.startsWith(prefixe)) return;

    const nomFichier = basename(cheminPublic);
    if (nomFichier !== cheminPublic.slice(prefixe.length)) return; // refuse tout sous-chemin ou « .. »

    try {
      await unlink(join(DOSSIER_UPLOADS, sousDossier, nomFichier));
    } catch (e) {
      const erreur = e as NodeJS.ErrnoException;
      if (erreur.code !== 'ENOENT') {
        this.logger.warn(
          `Impossible de supprimer ${cheminPublic} : ${erreur.message}`,
        );
      }
    }
  }
}
