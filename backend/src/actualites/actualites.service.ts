import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActualiteDto } from './dto/create-actualite.dto';
import {
  CagnottesService,
  UtilisateurVisiteur,
} from '../cagnottes/cagnottes.service';

@Injectable()
export class ActualitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cagnottesService: CagnottesService,
  ) {}

  async creer(idUtilisateur: number, dto: CreateActualiteDto) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: dto.id_cagnotte },
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Vous n'êtes pas le propriétaire de cette cagnotte.",
      );
    }
    if (cagnotte.statut === 'SUSPENDUE' || cagnotte.statut === 'ANNULEE') {
      throw new BadRequestException(
        'Impossible de publier une actualité sur une cagnotte suspendue ou annulée.',
      );
    }

    return this.prisma.actualite.create({
      data: {
        id_cagnotte: dto.id_cagnotte,
        titre: dto.titre,
        contenu: dto.contenu,
      },
    });
  }

  // Même règle de visibilité que GET /cagnottes/:id (404 pour une cagnotte masquée).
  async listerParCagnotte(
    idCagnotte: number,
    utilisateur: UtilisateurVisiteur,
  ) {
    await this.cagnottesService.trouverVisible(idCagnotte, utilisateur);
    return this.prisma.actualite.findMany({
      where: { id_cagnotte: idCagnotte },
      orderBy: { date_publication: 'desc' },
    });
  }
}
