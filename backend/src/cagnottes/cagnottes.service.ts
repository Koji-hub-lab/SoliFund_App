import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImagesService } from '../uploads/images.service';
import { RetraitsService } from '../retraits/retraits.service';
import { CreateCagnotteDto } from './dto/create-cagnotte.dto';
import { UpdateCagnotteDto } from './dto/update-cagnotte.dto';
import { ListerCagnottesDto } from './dto/lister-cagnottes.dto';
import { construirePage, lirePagination } from '../common/pagination';
import { estEchue } from '../common/dates';
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
const AVEC_CATEGORIE = {
  categorie: { select: { nom: true, couleur: true } },
} as const;

// Les dates de cagnotte sont des jours (@db.Date) : on compare à minuit UTC du jour courant.
function aujourdhui(): Date {
  const maintenant = new Date();
  return new Date(
    Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate(),
    ),
  );
}

function verifierDates(dateDebut: Date, dateFin: Date) {
  if (Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
    throw new BadRequestException('Dates invalides.');
  }
  if (dateFin <= dateDebut) {
    throw new BadRequestException(
      'La date de fin doit être après la date de début.',
    );
  }
}

// Utilisateur éventuellement connecté (req.user, ou null pour un visiteur).
export type UtilisateurVisiteur = {
  id_utilisateur: number;
  roles?: string[];
} | null;

@Injectable()
export class CagnottesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imagesService: ImagesService,
    private readonly retraitsService: RetraitsService,
  ) {}

  async creer(idUtilisateur: number, dto: CreateCagnotteDto) {
    const dateDebut = new Date(dto.date_debut);
    const dateFin = new Date(dto.date_fin);
    verifierDates(dateDebut, dateFin);
    if (dateFin < aujourdhui()) {
      throw new BadRequestException(
        'La date de fin ne peut pas être dans le passé.',
      );
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
      ...(dto.recherche
        ? { titre: { contains: dto.recherche, mode: 'insensitive' } }
        : {}),
      ...(dto.id_categorie ? { id_categorie: dto.id_categorie } : {}),
    };

    // id_cagnotte en dernier critère : ordre stable d'une page à l'autre en cas d'égalité.
    const ordres: Record<string, Prisma.CagnotteOrderByWithRelationInput[]> = {
      recentes: [{ date_creation: 'desc' }, { id_cagnotte: 'desc' }],
      populaires: [{ montant_collecte: 'desc' }, { id_cagnotte: 'desc' }],
      // Les ACTIVE d'abord (ordre de l'enum), puis la date de fin la plus proche.
      bientot_terminees: [
        { statut: 'asc' },
        { date_fin: 'asc' },
        { id_cagnotte: 'asc' },
      ],
    };

    const [lignes, total] = await this.prisma.$transaction([
      this.prisma.cagnotte.findMany({
        where,
        include: {
          ...AVEC_CATEGORIE,
          _count: { select: { dons: { where: { statut: 'VALIDE' } } } },
        },
        orderBy: ordres[dto.tri ?? 'recentes'],
        skip,
        take,
      }),
      this.prisma.cagnotte.count({ where }),
    ]);
    // nb_donateurs : nombre de dons validés (même définition que GET /cagnottes/:id).
    const donnees = lignes.map(({ _count, ...cagnotte }) => ({
      ...cagnotte,
      nb_donateurs: _count.dons,
    }));
    return construirePage(donnees, total, page, limite);
  }

  // Toutes les cagnottes de l'utilisateur, y compris privées, suspendues ou annulées.
  async listerMiennes(idUtilisateur: number) {
    const lignes = await this.prisma.cagnotte.findMany({
      where: { id_utilisateur: idUtilisateur },
      include: {
        ...AVEC_CATEGORIE,
        _count: { select: { dons: { where: { statut: 'VALIDE' } } } },
      },
      orderBy: { date_creation: 'desc' },
    });
    // Même calcul que la demande de retrait : collecté moins les retraits déjà engagés.
    const engages = await this.retraitsService.montantsEngages(
      lignes.map((c) => c.id_cagnotte),
    );
    return lignes.map(({ _count, ...cagnotte }) => ({
      ...cagnotte,
      nb_donateurs: _count.dons,
      montant_disponible:
        Number(cagnotte.montant_collecte) -
        (engages.get(cagnotte.id_cagnotte) ?? 0),
    }));
  }

  // Une cagnotte privée, suspendue ou annulée n'est visible que par son propriétaire ou un admin :
  // pour les autres, elle « n'existe pas » (404, pour ne pas révéler son existence).
  async trouverVisible(id: number, utilisateur: UtilisateurVisiteur) {
    const trouvee = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: id },
      include: {
        ...AVEC_CATEGORIE,
        // Uniquement des informations publiques : jamais l'email ni le téléphone de l'organisateur.
        utilisateur: {
          select: {
            prenom: true,
            nom: true,
            date_inscription: true,
            est_verifie: true,
          },
        },
        _count: { select: { dons: { where: { statut: 'VALIDE' } } } },
      },
    });
    if (!trouvee) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    const { utilisateur: organisateur, _count, ...cagnotte } = trouvee;
    const estVisible =
      cagnotte.est_publique &&
      (cagnotte.statut === 'ACTIVE' || cagnotte.statut === 'TERMINEE');
    const aAcces =
      !!utilisateur &&
      (utilisateur.id_utilisateur === cagnotte.id_utilisateur ||
        !!utilisateur.roles?.includes('ROLE_ADMIN'));
    if (!estVisible && !aAcces) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    return {
      ...cagnotte,
      nb_donateurs: _count.dons,
      organisateur: {
        prenom: organisateur.prenom,
        initiale_nom: organisateur.nom
          ? `${organisateur.nom.charAt(0).toUpperCase()}.`
          : '',
        date_inscription: organisateur.date_inscription,
        est_verifie: organisateur.est_verifie,
      },
    };
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
        "Vous n'êtes pas le propriétaire de cette cagnotte.",
      );
    }
    if (cagnotte.statut === 'SUSPENDUE' || cagnotte.statut === 'ANNULEE') {
      throw new BadRequestException(
        cagnotte.statut === 'SUSPENDUE'
          ? 'Cette cagnotte est suspendue par la modération : elle ne peut pas être modifiée.'
          : 'Cette cagnotte est annulée : elle ne peut plus être modifiée.',
      );
    }

    // Les dates sont vérifiées sur le résultat final (valeurs envoyées, sinon valeurs actuelles).
    const dateDebut = dto.date_debut
      ? new Date(dto.date_debut)
      : cagnotte.date_debut;
    const dateFin = dto.date_fin ? new Date(dto.date_fin) : cagnotte.date_fin;
    if (dto.date_debut || dto.date_fin) {
      verifierDates(dateDebut, dateFin);
    }

    // montant_collecte n'augmente qu'avec des dons validés.
    const dejaCollecte = Number(cagnotte.montant_collecte);
    if (
      dto.objectif !== undefined &&
      dejaCollecte > 0 &&
      dto.objectif < dejaCollecte
    ) {
      throw new BadRequestException(
        `L'objectif ne peut pas être inférieur au montant déjà collecté (${dejaCollecte} ${cagnotte.devise}).`,
      );
    }

    // Cagnotte TERMINEE dont la date de fin est repoussée dans le futur : elle reprend (ACTIVE).
    const reprend =
      cagnotte.statut === 'TERMINEE' && !!dto.date_fin && !estEchue(dateFin);

    try {
      return await this.prisma.cagnotte.update({
        // Statut lu plus haut : si la modération (ou la tâche nocturne) l'a changé entre-temps, on n'écrit rien.
        where: { id_cagnotte: id, statut: cagnotte.statut },
        data: {
          titre: dto.titre,
          description: dto.description,
          objectif: dto.objectif,
          date_debut: dto.date_debut ? dateDebut : undefined,
          date_fin: dto.date_fin ? dateFin : undefined,
          id_categorie: dto.id_categorie,
          statut: reprend ? 'ACTIVE' : undefined,
        },
        include: AVEC_CATEGORIE,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new BadRequestException(
          'Le statut de la cagnotte vient de changer. Rechargez la page puis réessayez.',
        );
      }
      throw e;
    }
  }

  async supprimer(id: number, idUtilisateur: number) {
    const cagnotte = await this.trouverParId(id);
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Vous n'êtes pas le propriétaire de cette cagnotte.",
      );
    }

    // Des dons (ou retraits) sont liés à la cagnotte : on garde l'historique et on l'annule.
    const [nbDons, nbRetraits] = await Promise.all([
      this.prisma.don.count({ where: { id_cagnotte: id } }),
      this.prisma.retrait.count({ where: { id_cagnotte: id } }),
    ]);
    if (nbDons > 0 || nbRetraits > 0) {
      if (cagnotte.statut === 'ANNULEE') {
        return {
          action: 'ANNULEE',
          message: 'Cette cagnotte est déjà annulée.',
        };
      }
      await this.prisma.cagnotte.update({
        where: { id_cagnotte: id },
        data: { statut: 'ANNULEE' },
      });
      return {
        action: 'ANNULEE',
        message:
          "Cette cagnotte a déjà reçu des dons : elle a été annulée au lieu d'être supprimée.",
      };
    }

    await this.prisma.cagnotte.delete({ where: { id_cagnotte: id } });
    await this.imagesService.supprimer(
      'cagnottes',
      cagnotte.image,
      cagnotte.image_miniature,
    );
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
        "Vous n'êtes pas le propriétaire de cette cagnotte.",
      );
    }

    // Deux versions WebP : image (1200 px) et image_miniature (400 px).
    const nouvelles = await this.imagesService.enregistrer(
      fichier,
      'cagnottes',
    );
    let misAJour: Prisma.CagnotteGetPayload<object>;
    try {
      misAJour = await this.prisma.cagnotte.update({
        where: { id_cagnotte: id },
        data: {
          image: nouvelles.image,
          image_miniature: nouvelles.image_miniature,
        },
      });
    } catch (e) {
      // La base n'a pas été mise à jour : on ne laisse pas de fichiers orphelins.
      await this.imagesService.supprimer(
        'cagnottes',
        nouvelles.image,
        nouvelles.image_miniature,
      );
      throw e;
    }

    // Remplacement : les deux anciennes versions sont supprimées.
    await this.imagesService.supprimer(
      'cagnottes',
      cagnotte.image,
      cagnotte.image_miniature,
    );
    return misAJour;
  }
}
