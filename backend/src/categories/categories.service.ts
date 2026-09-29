import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  lister() {
    return this.prisma.categorie.findMany({ orderBy: { nom: 'asc' } });
  }

  // Liste de l'administration : avec le nombre de cagnottes de chaque catégorie (tous statuts).
  async listerAdmin() {
    const categories = await this.prisma.categorie.findMany({
      include: { _count: { select: { cagnottes: true } } },
      orderBy: { nom: 'asc' },
    });
    return categories.map(({ _count, ...categorie }) => ({
      ...categorie,
      nb_cagnottes: _count.cagnottes,
    }));
  }

  // Un nom déjà pris est refusé par le filtre global (contrainte unique : 409).
  creer(dto: CreateCategorieDto) {
    return this.prisma.categorie.create({ data: dto });
  }

  async modifier(id: number, dto: UpdateCategorieDto) {
    await this.trouver(id);
    return this.prisma.categorie.update({
      where: { id_categorie: id },
      data: dto,
    });
  }

  // Refusée tant que des cagnottes (quel que soit leur statut) utilisent la catégorie.
  async supprimer(id: number) {
    await this.trouver(id);
    const nbCagnottes = await this.prisma.cagnotte.count({
      where: { id_categorie: id },
    });
    if (nbCagnottes > 0) {
      throw new ConflictException(
        `Cette catégorie est utilisée par ${nbCagnottes} cagnotte${nbCagnottes > 1 ? 's' : ''} : elle ne peut pas être supprimée.`,
      );
    }
    await this.prisma.categorie.delete({ where: { id_categorie: id } });
    return { message: 'Catégorie supprimée.' };
  }

  private async trouver(id: number) {
    const categorie = await this.prisma.categorie.findUnique({
      where: { id_categorie: id },
    });
    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    return categorie;
  }
}
