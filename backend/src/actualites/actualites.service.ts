import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActualiteDto } from './dto/create-actualite.dto';

@Injectable()
export class ActualitesService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(idUtilisateur: number, dto: CreateActualiteDto) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: dto.id_cagnotte },
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }
    if (cagnotte.id_utilisateur !== idUtilisateur) {
      throw new ForbiddenException(
        "Tu n'es pas le propriétaire de cette cagnotte.",
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

  async listerParCagnotte(idCagnotte: number) {
    return this.prisma.actualite.findMany({
      where: { id_cagnotte: idCagnotte },
      orderBy: { date_publication: 'desc' },
    });
  }
}
