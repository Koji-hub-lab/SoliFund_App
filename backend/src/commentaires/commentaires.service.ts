import { PaginationDto, construirePage, lirePagination } from '../common/pagination';
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';

@Injectable()
export class CommentairesService {
  constructor(private readonly prisma: PrismaService) {}

  creer(idUtilisateur: number, dto: CreateCommentaireDto) {
    return this.prisma.commentaire.create({
      data: {
        id_utilisateur: idUtilisateur,
        id_cagnotte: dto.id_cagnotte,
        description: dto.description,
      },
    });
  }

  async listerParCagnotte(idCagnotte: number, dto: PaginationDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where = { id_cagnotte: idCagnotte };
    const [donnees, total] = await this.prisma.$transaction([
      this.prisma.commentaire.findMany({
        where,
        include: { utilisateur: { select: { nom: true, prenom: true } } },
        orderBy: [{ date_creation: 'desc' }, { id_commentaire: 'desc' }],
        skip,
        take,
      }),
      this.prisma.commentaire.count({ where }),
    ]);
    return construirePage(donnees, total, page, limite);
  }

  async supprimer(idCommentaire: number, idUtilisateur: number) {
  const commentaire = await this.prisma.commentaire.findUnique({ where: { id_commentaire: idCommentaire } });
  if (!commentaire) {
    throw new NotFoundException('Commentaire introuvable.');
  }
  if (commentaire.id_utilisateur !== idUtilisateur) {
    throw new ForbiddenException("Tu ne peux pas supprimer ce commentaire.");
  }
  await this.prisma.commentaire.delete({ where: { id_commentaire: idCommentaire } });
  return { message: 'Commentaire supprimé.' };
}
}
