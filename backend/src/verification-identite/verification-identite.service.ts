import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VerificationIdentite } from '@prisma/client';
import { jourADouala } from '../common/dates';
import { construirePage, lirePagination } from '../common/pagination';
import {
  NotificationsService,
  type CodeNotification,
  type ParametresNotification,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockagePriveService } from '../uploads/stockage-prive.service';
import { AlertesAdminService } from '../alertes-admin/alertes-admin.service';
import { PublicationCagnottesService } from '../cagnottes/publication-cagnottes.service';
import { ListerVerificationsDto } from './dto/lister-verifications.dto';
import { SoumettreVerificationDto } from './dto/soumettre-verification.dto';
import { derniereVerification } from './identite';
import { m } from '../i18n/messages';
import {
  OPERATEURS_MOBILE_MONEY,
  numeroIncoherent,
} from '../config/operateurs-mobile-money';

const DOSSIER = 'identites';
const AGE_MINIMUM = 18;
// Les fichiers d'une soumission refusée sont supprimés après ce délai.
const CONSERVATION_REFUS_JOURS = 30;

export type FichiersIdentite = {
  recto?: Express.Multer.File[];
  verso?: Express.Multer.File[];
  selfie?: Express.Multer.File[];
};
export const NOMS_FICHIERS = ['recto', 'verso', 'selfie'] as const;
export type NomFichier = (typeof NOMS_FICHIERS)[number];

const LIBELLES_PIECES = {
  CNI: "carte nationale d'identité",
  RECEPISSE_CNI: 'récépissé de CNI',
  PASSEPORT: 'passeport',
};

function dateJour(jour: string): Date {
  return new Date(`${jour}T00:00:00.000Z`);
}

// Vue administrateur : jamais les noms de fichiers, seulement lesquels sont consultables.
function presenter<
  T extends Pick<
    VerificationIdentite,
    'fichier_recto' | 'fichier_verso' | 'fichier_selfie'
  >,
>({ fichier_recto, fichier_verso, fichier_selfie, ...verification }: T) {
  return {
    ...verification,
    fichiers: {
      recto: fichier_recto !== null,
      verso: fichier_verso !== null,
      selfie: fichier_selfie !== null,
    },
  };
}

@Injectable()
export class VerificationIdentiteService {
  private readonly logger = new Logger(VerificationIdentiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockage: StockagePriveService,
    private readonly notificationsService: NotificationsService,
    private readonly alertes: AlertesAdminService,
    private readonly publication: PublicationCagnottesService,
  ) {}

  async soumettre(
    idUtilisateur: number,
    dto: SoumettreVerificationDto,
    fichiers: FichiersIdentite,
  ) {
    const aujourdhui = jourADouala();

    // Le numéro de retrait doit appartenir à l'opérateur choisi (src/config/operateurs-mobile-money.ts).
    const autreOperateur = numeroIncoherent(
      dto.telephone_retrait,
      dto.methode_retrait,
    );
    if (autreOperateur) {
      throw new BadRequestException(
        m('paiement.numeroAutreOperateur', {
          operateur: OPERATEURS_MOBILE_MONEY[autreOperateur].nom,
        }),
      );
    }

    // Majorité : la personne doit avoir 18 ans révolus aujourd'hui (dates AAAA-MM-JJ comparables).
    const [annee, mois, jour] = aujourdhui.split('-');
    const naissanceLimite = `${Number(annee) - AGE_MINIMUM}-${mois}-${jour}`;
    if (dto.date_naissance > aujourdhui || dto.date_naissance < '1900-01-01') {
      throw new BadRequestException(m('identite.dateNaissanceInvalide'));
    }
    if (dto.date_naissance > naissanceLimite) {
      throw new BadRequestException(m('identite.ageMinimum'));
    }

    if (!dto.date_expiration && dto.type_piece !== 'RECEPISSE_CNI') {
      throw new BadRequestException(m('identite.expirationObligatoire'));
    }
    // La pièce reste valable jusqu'à la fin du jour d'expiration.
    if (dto.date_expiration && dto.date_expiration < aujourdhui) {
      throw new BadRequestException(m('identite.pieceExpiree'));
    }

    const recto = fichiers.recto?.[0]?.buffer;
    const verso = fichiers.verso?.[0]?.buffer;
    const selfie = fichiers.selfie?.[0]?.buffer;
    if (!recto) {
      throw new BadRequestException(m('identite.rectoObligatoire'));
    }
    if (!selfie) {
      throw new BadRequestException(m('identite.selfieObligatoire'));
    }
    if (!verso && dto.type_piece !== 'PASSEPORT') {
      throw new BadRequestException(m('identite.versoObligatoire'));
    }

    // Premier contrôle avant d'écrire les fichiers ; il est refait sous verrou plus bas.
    this.refuserSiDejaEnCours(
      await derniereVerification(this.prisma, idUtilisateur),
    );

    const nomRecto = await this.stockage.enregistrerImage(
      recto,
      DOSSIER,
      'recto',
    );
    let nomVerso: string | null = null;
    let nomSelfie: string | null = null;
    try {
      nomVerso = verso
        ? await this.stockage.enregistrerImage(verso, DOSSIER, 'verso')
        : null;
      nomSelfie = await this.stockage.enregistrerImage(
        selfie,
        DOSSIER,
        'selfie',
      );

      const creee = await this.prisma.$transaction(async (tx) => {
        // Verrou sur l'utilisateur : deux soumissions simultanées sont traitées l'une après l'autre.
        await tx.$queryRaw`SELECT id_utilisateur FROM slf_utilisateur WHERE id_utilisateur = ${idUtilisateur} FOR UPDATE`;
        this.refuserSiDejaEnCours(
          await derniereVerification(tx, idUtilisateur),
        );
        return tx.verificationIdentite.create({
          data: {
            id_utilisateur: idUtilisateur,
            type_piece: dto.type_piece,
            nom: dto.nom,
            prenoms: dto.prenoms,
            date_naissance: dateJour(dto.date_naissance),
            numero_piece: dto.numero_piece,
            date_expiration: dto.date_expiration
              ? dateJour(dto.date_expiration)
              : null,
            fichier_recto: nomRecto,
            fichier_verso: nomVerso,
            fichier_selfie: nomSelfie,
            telephone_retrait: dto.telephone_retrait,
            methode_retrait: dto.methode_retrait,
          },
        });
      });
      await this.alertes.alerter('IDENTITE_A_VERIFIER', {
        prenoms: dto.prenoms,
        nom: dto.nom,
      });
      return this.resume(creee);
    } catch (e) {
      // Rien n'a été enregistré en base : on ne laisse aucun fichier orphelin.
      await this.stockage.supprimer(DOSSIER, nomRecto, nomVerso, nomSelfie);
      throw e;
    }
  }

  // Statut de la dernière soumission de l'utilisateur, sans aucun fichier.
  async moi(idUtilisateur: number) {
    const derniere = await derniereVerification(this.prisma, idUtilisateur);
    return derniere
      ? this.resume(derniere)
      : { statut: 'NON_SOUMISE' as const };
  }

  async lister(dto: ListerVerificationsDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where: Prisma.VerificationIdentiteWhereInput = dto.statut
      ? { statut: dto.statut }
      : {};
    const [lignes, total] = await this.prisma.$transaction([
      this.prisma.verificationIdentite.findMany({
        where,
        include: {
          utilisateur: {
            select: {
              id_utilisateur: true,
              nom: true,
              prenom: true,
              email: true,
            },
          },
        },
        // Les plus anciennes demandes en attente d'abord.
        orderBy: [{ date_soumission: 'asc' }, { id_verification: 'asc' }],
        skip,
        take,
      }),
      this.prisma.verificationIdentite.count({ where }),
    ]);
    return construirePage(lignes.map(presenter), total, page, limite);
  }

  async detail(id: number) {
    const verification = await this.prisma.verificationIdentite.findUnique({
      where: { id_verification: id },
      include: {
        utilisateur: {
          select: {
            id_utilisateur: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            date_inscription: true,
          },
        },
        admin: { select: { id_utilisateur: true, nom: true, prenom: true } },
      },
    });
    if (!verification) {
      throw new NotFoundException(m('identite.introuvable'));
    }
    return presenter(verification);
  }

  // Ouvre un fichier pour un administrateur. Chaque consultation est journalisée (qui, quand).
  async lireFichier(id: number, nom: NomFichier, idAdmin: number) {
    const verification = await this.prisma.verificationIdentite.findUnique({
      where: { id_verification: id },
      select: {
        fichier_recto: true,
        fichier_verso: true,
        fichier_selfie: true,
      },
    });
    if (!verification) {
      throw new NotFoundException(m('identite.introuvable'));
    }
    const nomFichier = verification[`fichier_${nom}`];
    const fichier = nomFichier
      ? await this.stockage.lire(nomFichier, DOSSIER)
      : null;
    if (!fichier) {
      throw new NotFoundException(m('identite.fichierAbsent'));
    }
    await this.journaliser(id, idAdmin, 'CONSULTATION_FICHIER', nom);
    return fichier;
  }

  async valider(id: number, idAdmin: number) {
    const { count } = await this.prisma.verificationIdentite.updateMany({
      where: { id_verification: id, statut: 'EN_ATTENTE' },
      data: { statut: 'VALIDEE', date_decision: new Date(), id_admin: idAdmin },
    });
    const verification = await this.trouver(id);
    if (count === 0) {
      throw new BadRequestException(m('identite.validationImpossible'));
    }
    await this.journaliser(id, idAdmin, 'VALIDATION');
    await this.notifier(verification.id_utilisateur, 'IDENTITE_VERIFIEE', {
      telephone: verification.telephone_retrait,
    });
    // Les cagnottes de cet organisateur qui n'attendaient que son identité sont publiées.
    const publiees = await this.publication.activerApresIdentite(
      verification.id_utilisateur,
    );
    return { ...presenter(verification), cagnottes_publiees: publiees };
  }

  // Refuse une vérification en attente, ou révoque une vérification déjà validée (l'utilisateur
  // pourra alors en soumettre une nouvelle, par exemple pour changer de numéro de retrait).
  async refuser(id: number, idAdmin: number, motif: string) {
    const { count } = await this.prisma.verificationIdentite.updateMany({
      where: { id_verification: id, statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
      data: {
        statut: 'REFUSEE',
        motif_refus: motif,
        date_decision: new Date(),
        id_admin: idAdmin,
      },
    });
    const verification = await this.trouver(id);
    if (count === 0) {
      throw new BadRequestException(m('identite.dejaRefusee'));
    }
    await this.journaliser(id, idAdmin, 'REFUS', motif);
    await this.notifier(verification.id_utilisateur, 'IDENTITE_REFUSEE', {
      motif,
    });
    return presenter(verification);
  }

  // Supprime les fichiers des soumissions refusées depuis plus de 30 jours (tâche « purge-identites »,
  // voir TachesService).
  async purgerFichiersRefuses(maintenant: Date = new Date()): Promise<number> {
    const limite = new Date(
      maintenant.getTime() - CONSERVATION_REFUS_JOURS * 24 * 60 * 60 * 1000,
    );
    const aPurger = await this.prisma.verificationIdentite.findMany({
      where: {
        statut: 'REFUSEE',
        date_decision: { lt: limite },
        fichiers_supprimes_le: null,
      },
      select: {
        id_verification: true,
        fichier_recto: true,
        fichier_verso: true,
        fichier_selfie: true,
      },
    });
    for (const v of aPurger) {
      await this.stockage.supprimer(
        DOSSIER,
        v.fichier_recto,
        v.fichier_verso,
        v.fichier_selfie,
      );
      await this.prisma.verificationIdentite.update({
        where: { id_verification: v.id_verification },
        data: {
          fichier_recto: null,
          fichier_verso: null,
          fichier_selfie: null,
          fichiers_supprimes_le: maintenant,
        },
      });
    }
    return aPurger.length;
  }

  private refuserSiDejaEnCours(derniere: VerificationIdentite | null) {
    if (derniere?.statut === 'EN_ATTENTE') {
      throw new ConflictException(m('identite.dejaEnCours'));
    }
    if (derniere?.statut === 'VALIDEE') {
      throw new ConflictException(m('identite.dejaVerifiee'));
    }
  }

  // Ce que l'utilisateur voit de sa vérification : jamais les fichiers.
  private resume(v: VerificationIdentite) {
    return {
      id_verification: v.id_verification,
      statut: v.statut,
      motif_refus: v.motif_refus,
      type_piece: v.type_piece,
      libelle_piece: LIBELLES_PIECES[v.type_piece],
      telephone_retrait: v.telephone_retrait,
      methode_retrait: v.methode_retrait,
      date_soumission: v.date_soumission,
      date_decision: v.date_decision,
    };
  }

  private async trouver(id: number) {
    const verification = await this.prisma.verificationIdentite.findUnique({
      where: { id_verification: id },
    });
    if (!verification) {
      throw new NotFoundException(m('identite.introuvable'));
    }
    return verification;
  }

  // Journal durable (table) et ligne dans les journaux du serveur.
  private async journaliser(
    idVerification: number,
    idAdmin: number,
    action: 'CONSULTATION_FICHIER' | 'VALIDATION' | 'REFUS',
    detail?: string,
  ) {
    await this.prisma.journalVerificationIdentite.create({
      data: {
        id_verification: idVerification,
        id_admin: idAdmin,
        action,
        detail,
      },
    });
    this.logger.log(
      `${action} : vérification ${idVerification} par l'administrateur ${idAdmin}${action === 'CONSULTATION_FICHIER' ? ` (${detail})` : ''}`,
    );
  }

  // Un échec d'envoi de notification n'annule pas la décision.
  private async notifier(
    idUtilisateur: number,
    code: CodeNotification,
    parametres: ParametresNotification,
  ) {
    try {
      await this.notificationsService.envoyer(
        idUtilisateur,
        code,
        parametres,
        'VERIFICATION',
      );
    } catch (e) {
      this.logger.warn(
        `Notification de vérification non envoyée (utilisateur ${idUtilisateur}) : ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
