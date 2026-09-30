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
import { m } from '../i18n/messages';

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
      throw new NotFoundException(m('cagnottes.introuvable'));
    }
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(m('cagnottes.pasProprietaire'));
    }
    if (cagnotte.statut === 'SUSPENDUE' || cagnotte.statut === 'ANNULEE') {
      throw new BadRequestException(m('actualites.cagnotteFermee'));
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
