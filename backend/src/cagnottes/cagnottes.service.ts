import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCagnotteDto } from './dto/create-cagnotte.dto';
import { UpdateCagnotteDto } from './dto/update-cagnotte.dto';

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

@Injectable()
export class CagnottesService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(idUtilisateur: number, dto: CreateCagnotteDto) {
    return this.prisma.cagnotte.create({
      data: {
        titre: dto.titre,
        slug: genererSlug(dto.titre),
        description: dto.description,
        objectif: dto.objectif,
        date_debut: new Date(dto.date_debut),
        date_fin: new Date(dto.date_fin),
        devise: dto.devise ?? 'XAF',
        id_utilisateur: idUtilisateur,
        id_categorie: dto.id_categorie,
      },
    });
  }

  async listerPubliques() {
    return this.prisma.cagnotte.findMany({
      where: { est_publique: true },
      orderBy: { date_creation: 'desc' },
    });
  }

  async trouverParId(id: number) {
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

    return this.prisma.cagnotte.update({
      where: { id_cagnotte: id },
      data: {
        titre: dto.titre,
        description: dto.description,
        objectif: dto.objectif,
        date_debut: dto.date_debut ? new Date(dto.date_debut) : undefined,
        date_fin: dto.date_fin ? new Date(dto.date_fin) : undefined,
        id_categorie: dto.id_categorie,
      },
    });
  }

  async supprimer(id: number, idUtilisateur: number) {
    const cagnotte = await this.trouverParId(id);
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Tu n'es pas le propriétaire de cette cagnotte.",
      );
    }
    await this.prisma.cagnotte.delete({ where: { id_cagnotte: id } });
    return { message: 'Cagnotte supprimée.' };
  }

  async mettreAJourImage(
    id: number,
    idUtilisateur: number,
    cheminImage: string,
  ) {
    const cagnotte = await this.trouverParId(id);
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Tu n'es pas le propriétaire de cette cagnotte.",
      );
    }
    return this.prisma.cagnotte.update({
      where: { id_cagnotte: id },
      data: { image: cheminImage },
    });
  }
}
