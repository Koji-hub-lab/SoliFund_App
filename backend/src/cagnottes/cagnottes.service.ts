import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImagesService } from '../uploads/images.service';
import { CreateCagnotteDto } from './dto/create-cagnotte.dto';
import { UpdateCagnotteDto } from './dto/update-cagnotte.dto';
import { ListerCagnottesDto } from './dto/lister-cagnottes.dto';
import { construirePage, lirePagination } from '../common/pagination';
import { Prisma } from '@prisma/client';

function genererSlug(titre: string): string {
  return (
    titre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Date.now().toString(36)
  );
}

// Catégorie renvoyée avec chaque cagnotte (nom et couleur pour l'affichage).
const AVEC_CATEGORIE = { categorie: { select: { nom: true, couleur: true } } } as const;

// Les dates de cagnotte sont des jours (@db.Date) : on compare à minuit UTC du jour courant.
function aujourdhui(): Date {
  const maintenant = new Date();
  return new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()));
}

function verifierDates(dateDebut: Date, dateFin: Date) {
  if (Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
    throw new BadRequestException('Dates invalides.');
  }
  if (dateFin <= dateDebut) {
    throw new BadRequestException('La date de fin doit être après la date de début.');
  }
}

@Injectable()
export class CagnottesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imagesService: ImagesService,
  ) {}

  async creer(idUtilisateur: number, dto: CreateCagnotteDto) {
    const dateDebut = new Date(dto.date_debut);
    const dateFin = new Date(dto.date_fin);
    verifierDates(dateDebut, dateFin);
    if (dateFin < aujourdhui()) {
      throw new BadRequestException('La date de fin ne peut pas être dans le passé.');
    }

    return this.prisma.cagnotte.create({
      data: {
        titre: dto.titre,
        slug: genererSlug(dto.titre),
        description: dto.description,
        objectif: dto.objectif,
        date_debut: dateDebut,
        date_fin: dateFin,
        devise: dto.devise ?? 'XAF',
        id_utilisateur: idUtilisateur,
        id_categorie: dto.id_categorie,
      },
      include: AVEC_CATEGORIE,
    });
  }

  async listerPubliques(dto: ListerCagnottesDto) {
    const { page, limite, skip, take } = lirePagination(dto, 12);
    const where: Prisma.CagnotteWhereInput = {
      est_publique: true,
      statut: { in: ['ACTIVE', 'TERMINEE'] },
      ...(dto.recherche ? { titre: { contains: dto.recherche, mode: 'insensitive' } } : {}),
      ...(dto.id_categorie ? { id_categorie: dto.id_categorie } : {}),
    };

    // id_cagnotte en dernier critère : ordre stable d'une page à l'autre en cas d'égalité.
    const ordres: Record<string, Prisma.CagnotteOrderByWithRelationInput[]> = {
      recentes: [{ date_creation: 'desc' }, { id_cagnotte: 'desc' }],
      populaires: [{ montant_collecte: 'desc' }, { id_cagnotte: 'desc' }],
      // Les ACTIVE d'abord (ordre de l'enum), puis la date de fin la plus proche.
      bientot_terminees: [{ statut: 'asc' }, { date_fin: 'asc' }, { id_cagnotte: 'asc' }],
    };

    const [donnees, total] = await this.prisma.$transaction([
      this.prisma.cagnotte.findMany({
        where,
        include: AVEC_CATEGORIE,
        orderBy: ordres[dto.tri ?? 'recentes'],
        skip,
        take,
      }),
      this.prisma.cagnotte.count({ where }),
    ]);
    return construirePage(donnees, total, page, limite);
  }

  // Toutes les cagnottes de l'utilisateur, y compris privées, suspendues ou annulées.
  async listerMiennes(idUtilisateur: number) {
    return this.prisma.cagnotte.findMany({
      where: { id_utilisateur: idUtilisateur },
      include: AVEC_CATEGORIE,
      orderBy: { date_creation: 'desc' },
    });
  }

  // Une cagnotte privée, suspendue ou annulée n'est visible que par son propriétaire ou un admin :
  // pour les autres, elle « n'existe pas » (404, pour ne pas révéler son existence).
  async trouverVisible(id: number, utilisateur: { id_utilisateur: number; roles?: string[] } | null) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: id },
      include: AVEC_CATEGORIE,
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    const estVisible =
      cagnotte.est_publique && (cagnotte.statut === 'ACTIVE' || cagnotte.statut === 'TERMINEE');
    const aAcces =
      !!utilisateur &&
      (utilisateur.id_utilisateur === cagnotte.id_utilisateur || !!utilisateur.roles?.includes('ROLE_ADMIN'));
    if (!estVisible && !aAcces) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    return cagnotte;
  }

  private async trouverParId(id: number) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: id },
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    return cagnotte;
  }

  async modifier(id: number, idUtilisateur: number, dto: UpdateCagnotteDto) {
    const cagnotte = await this.trouverParId(id);
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Tu n'es pas le propriétaire de cette cagnotte.",
      );
    }

    // Les dates sont vérifiées sur le résultat final (valeurs envoyées, sinon valeurs actuelles).
    const dateDebut = dto.date_debut ? new Date(dto.date_debut) : cagnotte.date_debut;
    const dateFin = dto.date_fin ? new Date(dto.date_fin) : cagnotte.date_fin;
    if (dto.date_debut || dto.date_fin) {
      verifierDates(dateDebut, dateFin);
    }

    // montant_collecte n'augmente qu'avec des dons validés.
    const dejaCollecte = Number(cagnotte.montant_collecte);
    if (dto.objectif !== undefined && dejaCollecte > 0 && dto.objectif < dejaCollecte) {
      throw new BadRequestException(
        `L'objectif ne peut pas être inférieur au montant déjà collecté (${dejaCollecte} ${cagnotte.devise}).`,
      );
    }

    return this.prisma.cagnotte.update({
      where: { id_cagnotte: id },
      data: {
        titre: dto.titre,
        description: dto.description,
        objectif: dto.objectif,
        date_debut: dto.date_debut ? dateDebut : undefined,
        date_fin: dto.date_fin ? dateFin : undefined,
        id_categorie: dto.id_categorie,
      },
      include: AVEC_CATEGORIE,
    });
  }

  async supprimer(id: number, idUtilisateur: number) {
    const cagnotte = await this.trouverParId(id);
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Tu n'es pas le propriétaire de cette cagnotte.",
      );
    }

    // Des dons (ou retraits) sont liés à la cagnotte : on garde l'historique et on l'annule.
    const [nbDons, nbRetraits] = await Promise.all([
      this.prisma.don.count({ where: { id_cagnotte: id } }),
      this.prisma.retrait.count({ where: { id_cagnotte: id } }),
    ]);
    if (nbDons > 0 || nbRetraits > 0) {
      if (cagnotte.statut === 'ANNULEE') {
        return { action: 'ANNULEE', message: 'Cette cagnotte est déjà annulée.' };
      }
      await this.prisma.cagnotte.update({ where: { id_cagnotte: id }, data: { statut: 'ANNULEE' } });
      return {
        action: 'ANNULEE',
        message: 'Cette cagnotte a déjà reçu des dons : elle a été annulée au lieu d\'être supprimée.',
      };
    }

    await this.prisma.cagnotte.delete({ where: { id_cagnotte: id } });
    await this.imagesService.supprimer(cagnotte.image, 'cagnottes');
    return { action: 'SUPPRIMEE', message: 'Cagnotte supprimée.' };
  }

  async mettreAJourImage(
    id: number,
    idUtilisateur: number,
    fichier: Express.Multer.File | undefined,
  ) {
    const cagnotte = await this.trouverParId(id);
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Tu n'es pas le propriétaire de cette cagnotte.",
      );
    }

    const nouvelleImage = await this.imagesService.enregistrer(fichier, 'cagnottes');
    let misAJour;
    try {
      misAJour = await this.prisma.cagnotte.update({
        where: { id_cagnotte: id },
        data: { image: nouvelleImage },
      });
    } catch (e) {
      // La base n'a pas été mise à jour : on ne laisse pas de fichier orphelin.
      await this.imagesService.supprimer(nouvelleImage, 'cagnottes');
      throw e;
    }

    await this.imagesService.supprimer(cagnotte.image, 'cagnottes');
    return misAJour;
  }
}
