import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { construirePage, lirePagination } from '../common/pagination';
import { ListerCagnottesAdminDto } from './dto/lister-cagnottes-admin.dto';
import { ChangerStatutCagnotteDto } from './dto/changer-statut-cagnotte.dto';

const STATUTS_CAGNOTTE = [
  'ACTIVE',
  'TERMINEE',
  'SUSPENDUE',
  'ANNULEE',
] as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async statistiques() {
    const [nbUtilisateurs, parStatut, collecte, retire, retraitsEnAttente] =
      await this.prisma.$transaction([
        this.prisma.utilisateur.count(),
        this.prisma.cagnotte.groupBy({
          by: ['statut'],
          _count: { _all: true },
          orderBy: { statut: 'asc' },
        }),
        this.prisma.cagnotte.aggregate({ _sum: { montant_collecte: true } }),
        this.prisma.retrait.aggregate({
          where: { statut: 'TRAITE' },
          _sum: { montant: true },
        }),
        this.prisma.retrait.count({ where: { statut: 'EN_ATTENTE' } }),
      ]);

    // Tous les statuts sont présents dans la réponse, même à 0.
    const cagnottesParStatut = Object.fromEntries(
      STATUTS_CAGNOTTE.map((s) => [s, 0]),
    ) as Record<string, number>;
    for (const ligne of parStatut) {
      cagnottesParStatut[ligne.statut] = (
        ligne._count as { _all: number }
      )._all;
    }

    return {
      nb_utilisateurs: nbUtilisateurs,
      cagnottes_par_statut: cagnottesParStatut,
      montant_total_collecte: Number(collecte._sum.montant_collecte ?? 0),
      montant_total_retire: Number(retire._sum.montant ?? 0),
      nb_retraits_en_attente: retraitsEnAttente,
    };
  }

  // Toutes les cagnottes (y compris privées, suspendues, annulées), avec l'organisateur.
  async listerCagnottes(dto: ListerCagnottesAdminDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where: Prisma.CagnotteWhereInput = {
      ...(dto.statut ? { statut: dto.statut } : {}),
      ...(dto.recherche
        ? { titre: { contains: dto.recherche, mode: 'insensitive' } }
        : {}),
    };
    const [donnees, total] = await this.prisma.$transaction([
      this.prisma.cagnotte.findMany({
        where,
        include: {
          categorie: { select: { nom: true, couleur: true } },
          utilisateur: { select: { prenom: true, nom: true, email: true } },
        },
        orderBy: [{ date_creation: 'desc' }, { id_cagnotte: 'desc' }],
        skip,
        take,
      }),
      this.prisma.cagnotte.count({ where }),
    ]);
    return construirePage(donnees, total, page, limite);
  }

  // Suspension (motif obligatoire) ou réactivation d'une cagnotte, avec notification à l'organisateur.
  async changerStatutCagnotte(id: number, dto: ChangerStatutCagnotteDto) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: id },
    });
    if (!cagnotte) {
      throw new NotFoundException('Cagnotte introuvable.');
    }

    const statutAttendu = dto.statut === 'SUSPENDUE' ? 'ACTIVE' : 'SUSPENDUE';
    // Mise à jour conditionnelle : évite une double action (double clic, deux admins).
    const { count } = await this.prisma.cagnotte.updateMany({
      where: { id_cagnotte: id, statut: statutAttendu },
      data: { statut: dto.statut },
    });
    if (count === 0) {
      throw new BadRequestException(
        dto.statut === 'SUSPENDUE'
          ? 'Seule une cagnotte active peut être suspendue.'
          : 'Seule une cagnotte suspendue peut être réactivée.',
      );
    }

    const message =
      dto.statut === 'SUSPENDUE'
        ? `Votre cagnotte « ${cagnotte.titre} » a été suspendue par l'équipe Solifund. Motif : ${dto.motif}`
        : `Votre cagnotte « ${cagnotte.titre} » a été réactivée.`;
    try {
      await this.notificationsService.envoyer(
        cagnotte.id_utilisateur,
        dto.statut === 'SUSPENDUE'
          ? 'Cagnotte suspendue'
          : 'Cagnotte réactivée',
        message,
        'SYSTEME',
        cagnotte.id_cagnotte,
      );
    } catch (e) {
      this.logger.warn(
        `Notification non envoyée (cagnotte ${id}) : ${e instanceof Error ? e.message : e}`,
      );
    }

    return this.prisma.cagnotte.findUnique({ where: { id_cagnotte: id } });
  }
}
