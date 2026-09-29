import {
  PaginationDto,
  construirePage,
  lirePagination,
} from '../common/pagination';
import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CagnottesService,
  UtilisateurVisiteur,
} from '../cagnottes/cagnottes.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';

@Injectable()
export class CommentairesService {
  private readonly logger = new Logger(CommentairesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cagnottesService: CagnottesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async creer(
    utilisateur: NonNullable<UtilisateurVisiteur>,
    dto: CreateCommentaireDto,
  ) {
    // 404 si la cagnotte n'existe pas ou n'est pas visible par l'auteur (même règle que GET /cagnottes/:id).
    const cagnotte = await this.cagnottesService.trouverVisible(
      dto.id_cagnotte,
      utilisateur,
    );
    if (cagnotte.statut === 'SUSPENDUE' || cagnotte.statut === 'ANNULEE') {
      throw new BadRequestException(
        'Les commentaires sont fermés sur une cagnotte suspendue ou annulée.',
      );
    }

    const commentaire = await this.prisma.commentaire.create({
      data: {
        id_utilisateur: utilisateur.id_utilisateur,
        id_cagnotte: dto.id_cagnotte,
        description: dto.description,
      },
      include: { utilisateur: { select: { nom: true, prenom: true } } },
    });

    // L'organisateur est prévenu, sauf s'il commente sa propre cagnotte. Un échec d'envoi
    // n'annule pas le commentaire.
    if (cagnotte.id_utilisateur !== utilisateur.id_utilisateur) {
      try {
        await this.notificationsService.envoyer(
          cagnotte.id_utilisateur,
          'Nouveau commentaire',
          `${commentaire.utilisateur.prenom} a commenté votre cagnotte « ${cagnotte.titre} ».`,
          'COMMENTAIRE',
          cagnotte.id_cagnotte,
        );
      } catch (e) {
        this.logger.warn(
          `Notification de commentaire non envoyée (cagnotte ${cagnotte.id_cagnotte}) : ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    return commentaire;
  }

  // Même règle de visibilité que GET /cagnottes/:id (404 pour une cagnotte masquée).
  async listerParCagnotte(
    idCagnotte: number,
    dto: PaginationDto,
    utilisateur: UtilisateurVisiteur,
  ) {
    await this.cagnottesService.trouverVisible(idCagnotte, utilisateur);
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
    const commentaire = await this.prisma.commentaire.findUnique({
      where: { id_commentaire: idCommentaire },
    });
    if (!commentaire) {
      throw new NotFoundException('Commentaire introuvable.');
    }
    if (commentaire.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer ce commentaire.',
      );
    }
    await this.prisma.commentaire.delete({
      where: { id_commentaire: idCommentaire },
    });
    return { message: 'Commentaire supprimé.' };
  }
}
