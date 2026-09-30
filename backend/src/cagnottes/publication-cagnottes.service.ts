import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AlertesAdminService } from '../alertes-admin/alertes-admin.service';
import { jourADouala } from '../common/dates';
import {
  NotificationsService,
  type CodeNotification,
  type ParametresNotification,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  derniereVerification,
  identiteVerifiee,
} from '../verification-identite/identite';
import {
  RaisonVerification,
  RisqueCagnotteService,
} from './risque-cagnotte.service';
import { m } from '../i18n/messages';

export interface DecisionPublication {
  statut: 'ACTIVE' | 'EN_VERIFICATION';
  raisons: RaisonVerification[];
}

// Publication des cagnottes avec modération légère : une cagnotte est ACTIVE tout de suite si
// l'identité de l'organisateur est validée et qu'aucune règle de risque ne s'applique ; sinon elle
// attend en EN_VERIFICATION (invisible du public), avec les raisons enregistrées.
@Injectable()
export class PublicationCagnottesService {
  private readonly logger = new Logger(PublicationCagnottesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly risque: RisqueCagnotteService,
    private readonly notificationsService: NotificationsService,
    private readonly alertes: AlertesAdminService,
  ) {}

  // Statut à donner à une cagnotte. À la création (exigerIdentiteSoumise), l'organisateur doit
  // avoir soumis une vérification d'identité : en attente ou validée.
  async decider(options: {
    idUtilisateur: number;
    objectif: number;
    idCagnotte?: number;
    exigerIdentiteSoumise?: boolean;
    apresRefus?: boolean;
  }): Promise<DecisionPublication> {
    const identite = await derniereVerification(
      this.prisma,
      options.idUtilisateur,
    );
    if (
      options.exigerIdentiteSoumise &&
      (!identite || identite.statut === 'REFUSEE')
    ) {
      throw new ForbiddenException(
        identite
          ? m('cagnottes.identiteRefusee')
          : m('cagnottes.identiteRequise'),
      );
    }

    const raisons = await this.risque.evaluer(options);
    if (identite?.statut !== 'VALIDEE') raisons.push('IDENTITE_EN_ATTENTE');
    if (options.apresRefus) raisons.push('REVISION_APRES_REFUS');
    return {
      statut: raisons.length > 0 ? 'EN_VERIFICATION' : 'ACTIVE',
      raisons,
    };
  }

  // Prévient les administrateurs qu'une cagnotte attend leur décision.
  async alerterCagnotteEnVerification(cagnotte: {
    id_cagnotte: number;
    titre: string;
    raisons_verification: string[];
  }) {
    await this.alertes.alerter(
      'CAGNOTTE_EN_VERIFICATION',
      { titre: cagnotte.titre, raisons: cagnotte.raisons_verification },
      cagnotte.id_cagnotte,
    );
  }

  // Appelée quand l'identité d'un organisateur vient d'être validée : ses cagnottes qui
  // n'attendaient que cela (aucune règle de risque) sont publiées.
  async activerApresIdentite(idUtilisateur: number): Promise<number> {
    const enAttente = await this.prisma.cagnotte.findMany({
      where: {
        id_utilisateur: idUtilisateur,
        statut: 'EN_VERIFICATION',
        raisons_verification: { equals: ['IDENTITE_EN_ATTENTE'] },
      },
    });
    let nb = 0;
    for (const cagnotte of enAttente) {
      // Date de fin dépassée : l'organisateur doit d'abord corriger ses dates.
      if (cagnotte.date_fin < this.aujourdhui()) continue;
      if (await this.activer(cagnotte)) {
        nb += 1;
        await this.notifier(cagnotte, 'CAGNOTTE_PUBLIEE_IDENTITE', {
          titre: cagnotte.titre,
        });
      }
    }

    // Les autres cagnottes en vérification (règle de risque) restent en attente d'un
    // administrateur, mais la raison « identité en attente » ne vaut plus.
    const autres = await this.prisma.cagnotte.findMany({
      where: {
        id_utilisateur: idUtilisateur,
        statut: 'EN_VERIFICATION',
        raisons_verification: { has: 'IDENTITE_EN_ATTENTE' },
        NOT: { raisons_verification: { equals: ['IDENTITE_EN_ATTENTE'] } },
      },
      select: { id_cagnotte: true, raisons_verification: true },
    });
    for (const cagnotte of autres) {
      await this.prisma.cagnotte.updateMany({
        where: { id_cagnotte: cagnotte.id_cagnotte, statut: 'EN_VERIFICATION' },
        data: {
          raisons_verification: cagnotte.raisons_verification.filter(
            (r) => r !== 'IDENTITE_EN_ATTENTE',
          ),
        },
      });
    }
    return nb;
  }

  // Décision d'un administrateur : publie une cagnotte en vérification.
  async approuver(idCagnotte: number) {
    const cagnotte = await this.trouver(idCagnotte);
    if (cagnotte.statut !== 'EN_VERIFICATION') {
      throw new BadRequestException(m('cagnottes.approbationImpossible'));
    }
    if (!(await identiteVerifiee(this.prisma, cagnotte.id_utilisateur))) {
      throw new BadRequestException(m('cagnottes.identiteNonValidee'));
    }
    if (cagnotte.date_fin < this.aujourdhui()) {
      throw new BadRequestException(m('cagnottes.dateFinDepassee'));
    }
    if (!(await this.activer(cagnotte))) {
      throw new BadRequestException(m('cagnottes.statutChange'));
    }
    await this.notifier(cagnotte, 'CAGNOTTE_PUBLIEE', {
      titre: cagnotte.titre,
    });
    return this.trouver(idCagnotte);
  }

  // Décision d'un administrateur : refuse une cagnotte en vérification, avec un motif.
  async refuser(idCagnotte: number, motif: string) {
    const cagnotte = await this.trouver(idCagnotte);
    const { count } = await this.prisma.cagnotte.updateMany({
      where: { id_cagnotte: idCagnotte, statut: 'EN_VERIFICATION' },
      data: { statut: 'REFUSEE', motif_refus: motif, raisons_verification: [] },
    });
    if (count === 0) {
      throw new BadRequestException(m('cagnottes.refusImpossible'));
    }
    await this.notifier(cagnotte, 'CAGNOTTE_REFUSEE', {
      titre: cagnotte.titre,
      motif,
    });
    return this.trouver(idCagnotte);
  }

  // EN_VERIFICATION → ACTIVE, de façon conditionnelle (double clic, deux administrateurs). Si la
  // date de début est passée, elle est ramenée à aujourd'hui.
  private async activer(cagnotte: {
    id_cagnotte: number;
    date_debut: Date;
  }): Promise<boolean> {
    const aujourdhui = this.aujourdhui();
    const { count } = await this.prisma.cagnotte.updateMany({
      where: { id_cagnotte: cagnotte.id_cagnotte, statut: 'EN_VERIFICATION' },
      data: {
        statut: 'ACTIVE',
        raisons_verification: [],
        motif_refus: null,
        date_debut: cagnotte.date_debut < aujourdhui ? aujourdhui : undefined,
      },
    });
    return count === 1;
  }

  // Jour courant à Douala, au format des colonnes @db.Date (minuit UTC).
  private aujourdhui(): Date {
    return new Date(`${jourADouala()}T00:00:00.000Z`);
  }

  private async trouver(idCagnotte: number) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: idCagnotte },
    });
    if (!cagnotte) {
      throw new NotFoundException(m('cagnottes.introuvable'));
    }
    return cagnotte;
  }

  private async notifier(
    cagnotte: { id_cagnotte: number; id_utilisateur: number },
    code: CodeNotification,
    parametres: ParametresNotification,
  ) {
    try {
      await this.notificationsService.envoyer(
        cagnotte.id_utilisateur,
        code,
        parametres,
        'SYSTEME',
        cagnotte.id_cagnotte,
      );
    } catch (e) {
      this.logger.warn(
        `Notification non envoyée (cagnotte ${cagnotte.id_cagnotte}) : ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
