import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { AlertesAdminService } from '../alertes-admin/alertes-admin.service';
import {
  CagnottesService,
  UtilisateurVisiteur,
} from '../cagnottes/cagnottes.service';
import { construirePage, lirePagination } from '../common/pagination';
import { seuilSignalements } from '../config/seuils';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreerSignalementDto } from './dto/creer-signalement.dto';
import { ListerSignalementsDto } from './dto/lister-signalements.dto';
import { m } from '../i18n/messages';

@Injectable()
export class SignalementsService {
  private readonly logger = new Logger(SignalementsService.name);
  private readonly seuil: number;
  private readonly sel: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cagnottesService: CagnottesService,
    private readonly notificationsService: NotificationsService,
    private readonly alertes: AlertesAdminService,
  ) {
    this.seuil = seuilSignalements(config);
    this.sel = config.getOrThrow<string>('JWT_SECRET');
  }

  // Un seul signalement par cagnotte : par compte pour un utilisateur connecté, par adresse IP
  // pour un visiteur (l'IP n'est gardée que sous forme d'empreinte).
  async signaler(
    idCagnotte: number,
    utilisateur: UtilisateurVisiteur,
    ip: string,
    dto: CreerSignalementDto,
  ) {
    // 404 si la cagnotte n'est pas visible par l'auteur (même règle que GET /cagnottes/:id).
    const cagnotte = await this.cagnottesService.trouverVisible(
      idCagnotte,
      utilisateur,
    );
    if (utilisateur?.id_utilisateur === cagnotte.id_utilisateur) {
      throw new BadRequestException(m('signalements.propreCagnotte'));
    }

    try {
      await this.prisma.signalement.create({
        data: {
          id_cagnotte: idCagnotte,
          motif: dto.motif,
          commentaire: dto.commentaire || null,
          id_utilisateur: utilisateur?.id_utilisateur ?? null,
          empreinte_ip: utilisateur ? null : this.empreinte(ip),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(m('signalements.dejaSignalee'));
      }
      throw e;
    }

    await this.suspendreSiSeuilAtteint(cagnotte);
    return {
      message: m('signalements.transmis'),
    };
  }

  async lister(dto: ListerSignalementsDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where: Prisma.SignalementWhereInput = {
      ...(dto.statut ? { statut: dto.statut } : {}),
      ...(dto.id_cagnotte ? { id_cagnotte: dto.id_cagnotte } : {}),
    };
    const [lignes, total] = await this.prisma.$transaction([
      this.prisma.signalement.findMany({
        where,
        select: {
          id_signalement: true,
          motif: true,
          commentaire: true,
          date: true,
          statut: true,
          date_classement: true,
          cagnotte: {
            select: { id_cagnotte: true, titre: true, statut: true },
          },
          utilisateur: {
            select: {
              id_utilisateur: true,
              prenom: true,
              nom: true,
              email: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { id_signalement: 'desc' }],
        skip,
        take,
      }),
      this.prisma.signalement.count({ where }),
    ]);
    return construirePage(lignes, total, page, limite);
  }

  // Un signalement classé ne compte plus pour la suspension automatique.
  async classer(idSignalement: number, idAdmin: number) {
    const { count } = await this.prisma.signalement.updateMany({
      where: { id_signalement: idSignalement, statut: 'OUVERT' },
      data: {
        statut: 'CLASSE',
        date_classement: new Date(),
        id_admin: idAdmin,
      },
    });
    const signalement = await this.prisma.signalement.findUnique({
      where: { id_signalement: idSignalement },
      select: { id_signalement: true, statut: true, date_classement: true },
    });
    if (!signalement) {
      throw new NotFoundException(m('signalements.introuvable'));
    }
    if (count === 0) {
      throw new BadRequestException(m('signalements.dejaClasse'));
    }
    return signalement;
  }

  // Classe tous les signalements ouverts d'une cagnotte (quand un administrateur la réactive).
  async classerPourCagnotte(idCagnotte: number, idAdmin?: number) {
    await this.prisma.signalement.updateMany({
      where: { id_cagnotte: idCagnotte, statut: 'OUVERT' },
      data: {
        statut: 'CLASSE',
        date_classement: new Date(),
        id_admin: idAdmin ?? null,
      },
    });
  }

  compterOuverts() {
    return this.prisma.signalement.count({ where: { statut: 'OUVERT' } });
  }

  // À partir du seuil de signalements ouverts, une cagnotte ACTIVE est suspendue : l'organisateur
  // est prévenu et les administrateurs sont alertés.
  private async suspendreSiSeuilAtteint(cagnotte: {
    id_cagnotte: number;
    id_utilisateur: number;
    titre: string;
  }) {
    const ouverts = await this.prisma.signalement.count({
      where: { id_cagnotte: cagnotte.id_cagnotte, statut: 'OUVERT' },
    });
    if (ouverts < this.seuil) return;

    const { count } = await this.prisma.cagnotte.updateMany({
      where: { id_cagnotte: cagnotte.id_cagnotte, statut: 'ACTIVE' },
      data: { statut: 'SUSPENDUE' },
    });
    if (count === 0) return;

    try {
      await this.notificationsService.envoyer(
        cagnotte.id_utilisateur,
        'CAGNOTTE_SUSPENDUE_SIGNALEMENTS',
        { titre: cagnotte.titre },
        'SYSTEME',
        cagnotte.id_cagnotte,
      );
    } catch (e) {
      this.logger.warn(
        `Notification non envoyée (cagnotte ${cagnotte.id_cagnotte}) : ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    await this.alertes.alerter(
      'SUSPENSION_AUTOMATIQUE',
      { titre: cagnotte.titre, nombre: ouverts },
      cagnotte.id_cagnotte,
    );
  }

  private empreinte(ip: string): string {
    return createHash('sha256').update(`${this.sel}:${ip}`).digest('hex');
  }
}
