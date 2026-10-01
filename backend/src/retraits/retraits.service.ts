import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationsService,
  type CodeNotification,
  type ParametresNotification,
} from '../notifications/notifications.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';
import { RejectRetraitDto } from './dto/reject-retrait.dto';
import { ListerRetraitsDto } from './dto/lister-retraits.dto';
import { construirePage, lirePagination } from '../common/pagination';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { calculerCommission, tauxCommission } from './commission';

import { derniereVerification } from '../verification-identite/identite';
import { m } from '../i18n/messages';
import {
  AlertesAdminService,
  type CodeAlerte,
} from '../alertes-admin/alertes-admin.service';
import { FournisseursPaiement } from '../payment/fournisseurs-paiement.service';
import type {
  FournisseurPaiement,
  NomFournisseur,
  OperationFournisseur,
  SoldeFournisseur,
} from '../payment/fournisseur-paiement';
import {
  ErreurIntrouvablePaiement,
  ErreurPaiement,
  estErreurTemporaire,
} from '../payment/paiement.erreurs';
import {
  normaliserNumero,
  type MethodePaiement,
} from '../payment/notchpay.utilitaires';

// Un retrait APPROUVE (versement lancé) est réconcilié s'il n'a pas de statut final après 5 minutes.
export const DELAI_RECONCILIATION_RETRAITS_MS = 5 * 60 * 1000;
const LOT_RECONCILIATION = 50;

@Injectable()
export class RetraitsService {
  private readonly logger = new Logger(RetraitsService.name);

  // Taux de commission en vigueur : appliqué aux nouvelles demandes, puis figé dans chaque retrait.
  private readonly tauxCommission: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly fournisseurs: FournisseursPaiement,
    private readonly alertesAdmin: AlertesAdminService,
    config: ConfigService,
  ) {
    this.tauxCommission = tauxCommission(config);
  }

  // Prévient l'organisateur. Appelée après la transaction : un échec d'envoi ne doit pas
  // faire croire à l'admin que le traitement a échoué.
  private async notifierOrganisateur(
    retrait: {
      id_retrait: number;
      id_utilisateur: number;
      id_cagnotte: number;
    },
    code: CodeNotification,
    parametres: ParametresNotification,
  ) {
    try {
      await this.notificationsService.envoyer(
        retrait.id_utilisateur,
        code,
        parametres,
        'RETRAIT',
        retrait.id_cagnotte,
      );
    } catch (e) {
      this.logger.warn(
        `Notification non envoyée (retrait ${retrait.id_retrait}) : ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  // Montant BRUT déjà engagé en retraits (EN_ATTENTE, APPROUVE, TRAITE) pour chaque cagnotte
  // demandée : le disponible d'une cagnotte se calcule toujours sur le brut (commission comprise).
  // Un retrait REJETE ou ECHOUE (versement échoué, en attente d'une relance) n'est pas engagé.
  // `client` permet d'appeler la méthode dans une transaction (voir demander()).
  // Renvoie une Map id_cagnotte -> montant ; une cagnotte sans retrait vaut 0.
  async montantsEngages(
    idsCagnottes: number[],
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<Map<number, number>> {
    const engages = new Map<number, number>(idsCagnottes.map((id) => [id, 0]));
    if (idsCagnottes.length === 0) return engages;
    const lignes = await client.retrait.groupBy({
      by: ['id_cagnotte'],
      where: {
        id_cagnotte: { in: idsCagnottes },
        statut: { in: ['EN_ATTENTE', 'APPROUVE', 'TRAITE'] },
      },
      _sum: { montant_brut: true },
    });
    for (const ligne of lignes) {
      engages.set(ligne.id_cagnotte, Number(ligne._sum.montant_brut ?? 0));
    }
    return engages;
  }

  // L'identité de l'organisateur doit être vérifiée. Le retrait est toujours versé sur le numéro
  // et l'opérateur de cette vérification : ils ne se choisissent pas dans la demande.
  async demander(idUtilisateur: number, dto: CreateRetraitDto) {
    return this.prisma.$transaction(async (tx) => {
      const identite = await derniereVerification(tx, idUtilisateur);
      if (identite?.statut !== 'VALIDEE') {
        throw new ForbiddenException(
          identite?.statut === 'EN_ATTENTE'
            ? m('retraits.identiteEnAttente')
            : m('retraits.identiteRequise'),
        );
      }

      const cagnotte = await this.verrouillerCagnotte(tx, dto.id_cagnotte);
      if (cagnotte.id_utilisateur !== idUtilisateur) {
        throw new ForbiddenException(m('cagnottes.pasProprietaire'));
      }
      if (cagnotte.statut === 'SUSPENDUE' || cagnotte.statut === 'ANNULEE') {
        throw new BadRequestException(m('retraits.cagnotteFermee'));
      }
      await this.verifierDisponible(tx, dto.id_cagnotte, cagnotte, dto.montant);

      return tx.retrait.create({
        data: {
          id_utilisateur: idUtilisateur,
          id_cagnotte: dto.id_cagnotte,
          // Commission figée à la demande : l'historique reste juste si le taux change ensuite.
          montant_brut: dto.montant,
          taux_commission: this.tauxCommission,
          ...calculerCommission(dto.montant, this.tauxCommission),
          methode_retrait: identite.methode_retrait,
          numero_beneficiaire: identite.telephone_retrait,
        },
      });
    });
  }

  // Verrouille la ligne de la cagnotte : deux opérations simultanées sont sérialisées.
  private async verrouillerCagnotte(
    tx: Prisma.TransactionClient,
    idCagnotte: number,
  ) {
    const lignes = await tx.$queryRaw<
      {
        id_utilisateur: number;
        montant_collecte: unknown;
        statut: string;
        devise: string;
        titre: string;
      }[]
    >`SELECT id_utilisateur, montant_collecte, statut::text AS statut, devise, titre
      FROM slf_cagnotte WHERE id_cagnotte = ${idCagnotte} FOR UPDATE`;
    if (!lignes[0]) {
      throw new NotFoundException(m('cagnottes.introuvable'));
    }
    return lignes[0];
  }

  // Refuse un montant brut supérieur à ce qui reste disponible sur la cagnotte.
  private async verifierDisponible(
    tx: Prisma.TransactionClient,
    idCagnotte: number,
    cagnotte: { montant_collecte: unknown; devise: string },
    montantBrut: number,
  ) {
    const engage =
      (await this.montantsEngages([idCagnotte], tx)).get(idCagnotte) ?? 0;
    const disponible = Number(cagnotte.montant_collecte) - engage;
    if (montantBrut > disponible) {
      throw new BadRequestException(
        m('retraits.disponibleInsuffisant', {
          disponible,
          devise: cagnotte.devise,
        }),
      );
    }
  }

  // « Approuver et verser » (retrait EN_ATTENTE) ou « Relancer le versement » (retrait ECHOUE) :
  // le retrait passe en APPROUVE, puis le montant net est envoyé UNE fois par le fournisseur actif
  // sur le numéro vérifié de l'organisateur. Le statut final (TRAITE ou ECHOUE) vient ensuite du
  // webhook ou de la réconciliation, toujours après avoir reconsulté le versement. Un versement
  // n'est jamais renvoyé automatiquement.
  async approuverEtVerser(idRetrait: number, idAdmin: number) {
    const retrait = await this.prisma.retrait.findUnique({
      where: { id_retrait: idRetrait },
      include: {
        utilisateur: { select: { nom: true, prenom: true } },
        cagnotte: { select: { titre: true } },
      },
    });
    if (!retrait) {
      throw new NotFoundException(m('retraits.introuvable'));
    }
    if (retrait.statut === 'APPROUVE') {
      throw new BadRequestException(m('retraits.versementEnCours'));
    }
    if (retrait.statut !== 'EN_ATTENTE' && retrait.statut !== 'ECHOUE') {
      throw new BadRequestException(m('retraits.dejaTraite'));
    }
    const statutDepart = retrait.statut;
    const numero = normaliserNumero(retrait.numero_beneficiaire);
    if (!numero) {
      throw new BadRequestException(
        m('validation.numeroMobileMoney', {
          champ: { cle: 'champs.numeroRetrait' },
        }),
      );
    }
    const net = Number(retrait.montant_net);
    // Fournisseur actif (PAIEMENT_FOURNISSEUR) : il versera, et sera consulté ensuite.
    const fournisseur = this.fournisseurs.actif();

    // Relance : le versement précédent doit être confirmé « échoué » par son fournisseur.
    if (statutDepart === 'ECHOUE') {
      await this.confirmerEchecPrecedent(retrait);
    }

    // Solde chez le fournisseur : inutile de lancer un versement qui sera refusé.
    await this.verifierSolde(fournisseur, net, retrait.methode_retrait);

    // Transition conditionnelle : un double clic ou deux administrateurs ne lancent qu'un versement.
    // Chaque tentative a sa propre référence (« SOLIFUND-RET-12 », puis « SOLIFUND-RET-12-2 »...).
    const tentative = retrait.tentatives_versement + 1;
    const reference =
      tentative === 1
        ? `SOLIFUND-RET-${idRetrait}`
        : `SOLIFUND-RET-${idRetrait}-${tentative}`;
    await this.prisma.$transaction(async (tx) => {
      if (statutDepart === 'ECHOUE') {
        // Un retrait échoué n'était plus engagé : la somme doit encore être disponible.
        const cagnotte = await this.verrouillerCagnotte(
          tx,
          retrait.id_cagnotte,
        );
        await this.verifierDisponible(
          tx,
          retrait.id_cagnotte,
          cagnotte,
          Number(retrait.montant_brut),
        );
      }
      const { count } = await tx.retrait.updateMany({
        where: { id_retrait: idRetrait, statut: statutDepart },
        data: {
          statut: 'APPROUVE',
          date_validation: new Date(),
          tentatives_versement: tentative,
          reference_retrait: reference,
          fournisseur: fournisseur.nom,
          reference_fournisseur: null,
          code_erreur: null,
          message_erreur: null,
          traite_par: idAdmin,
        },
      });
      if (count === 0) {
        throw new BadRequestException(m('retraits.dejaTraite'));
      }
    });
    this.logger.log(
      `Retrait ${idRetrait} : versement de ${net} XAF lancé par l'administrateur ${idAdmin} (référence ${reference}).`,
    );

    try {
      const versement = await fournisseur.initierVersement({
        montant: net,
        reference,
        description: `Retrait SoliFund : ${retrait.cagnotte.titre}`.slice(
          0,
          200,
        ),
        methode: retrait.methode_retrait,
        numero,
        nomBeneficiaire:
          `${retrait.utilisateur.prenom} ${retrait.utilisateur.nom}`.trim(),
      });
      await this.prisma.retrait.update({
        where: { id_retrait: idRetrait },
        data: { reference_fournisseur: versement.referenceFournisseur },
      });
      // Le plus souvent « en cours » ; un statut déjà final est appliqué tout de suite.
      await this.appliquerStatutVersement(idRetrait, versement);
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      if (estErreurTemporaire(e)) {
        // On ne sait pas si le versement est parti : le retrait reste APPROUVE, sans relance
        // possible, pour ne jamais verser deux fois.
        this.logger.error(
          `Retrait ${idRetrait} : ${fournisseur.libelle} n'a pas répondu au versement ${reference} (${e.name} : ${e.message}). À vérifier dans son tableau de bord.`,
        );
        await this.alerterUneFois(idRetrait, 'VERSEMENT_INCERTAIN');
        throw new ServiceUnavailableException(
          m('retraits.versementIncertain', {
            fournisseur: fournisseur.libelle,
          }),
        );
      }
      // Refus définitif : rien n'a été versé, le retrait peut être relancé ou rejeté.
      await this.marquerEchoue(idRetrait, e.code ?? e.name, e.message, false);
      throw new BadRequestException(
        m('retraits.versementRefuse', {
          detail: e.message,
          fournisseur: fournisseur.libelle,
        }),
      );
    }
    return this.prisma.retrait.findUnique({ where: { id_retrait: idRetrait } });
  }

  // Avant une relance : reconsulte le versement précédent (s'il a une référence chez le
  // fournisseur, c'est-à-dire s'il a été accepté). On ne relance que s'il est confirmé échoué ;
  // s'il a finalement abouti, le retrait passe en TRAITE sans rien renvoyer.
  private async confirmerEchecPrecedent(retrait: {
    id_retrait: number;
    fournisseur: NomFournisseur | null;
    reference_fournisseur: string | null;
    methode_retrait: MethodePaiement;
    montant_net: unknown;
  }) {
    if (!retrait.reference_fournisseur || !retrait.fournisseur) return;
    const fournisseur = this.fournisseurs.get(retrait.fournisseur);
    let precedent: OperationFournisseur;
    try {
      precedent = await fournisseur.consulterVersement(
        retrait.reference_fournisseur,
        retrait.methode_retrait,
      );
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      this.logger.warn(
        `Retrait ${retrait.id_retrait} : versement précédent ${retrait.reference_fournisseur} non confirmé (${e.name} : ${e.message}). Relance refusée.`,
      );
      throw new ServiceUnavailableException(
        m('retraits.precedentNonConfirme', {
          fournisseur: fournisseur.libelle,
        }),
      );
    }
    if (precedent.statut === 'ECHOUE') return;
    if (precedent.statut === 'EN_ATTENTE') {
      throw new ConflictException(
        m('retraits.precedentEnCours', { fournisseur: fournisseur.libelle }),
      );
    }
    // Abouti : jamais de second versement. Le montant doit être exactement le net du retrait.
    const net = Number(retrait.montant_net);
    if (
      precedent.montant !== undefined &&
      (precedent.montant !== net ||
        (precedent.devise ?? 'XAF').toUpperCase() !== 'XAF')
    ) {
      this.logger.error(
        `Retrait ${retrait.id_retrait} : versement précédent ${retrait.reference_fournisseur} abouti avec un montant incohérent (attendu ${net} XAF, reçu ${precedent.montant} ${precedent.devise ?? ''}). Relance refusée, à traiter à la main.`,
      );
      throw new ConflictException(
        m('retraits.precedentNonConfirme', {
          fournisseur: fournisseur.libelle,
        }),
      );
    }
    this.logger.warn(
      `Retrait ${retrait.id_retrait} : le versement précédent ${retrait.reference_fournisseur} a finalement abouti. Retrait marqué TRAITE, aucune relance.`,
    );
    await this.finaliser(retrait.id_retrait, 'ECHOUE');
    throw new ConflictException(
      m('retraits.precedentReussi', { fournisseur: fournisseur.libelle }),
    );
  }

  // Prévient les administrateurs d'un versement à vérifier à la main, une seule fois par
  // tentative : le code de l'alerte est noté dans code_erreur du retrait APPROUVE (remis à zéro
  // à chaque tentative), et seule la première alerte de la tentative est envoyée.
  private async alerterUneFois(idRetrait: number, code: CodeAlerte) {
    const { count } = await this.prisma.retrait.updateMany({
      where: { id_retrait: idRetrait, statut: 'APPROUVE', code_erreur: null },
      data: { code_erreur: code },
    });
    if (count === 0) return;
    const retrait = await this.prisma.retrait.findUniqueOrThrow({
      where: { id_retrait: idRetrait },
    });
    await this.alertesAdmin.alerter(
      code,
      {
        retrait: idRetrait,
        montant: Number(retrait.montant_net),
        fournisseur: retrait.fournisseur
          ? this.fournisseurs.get(retrait.fournisseur).libelle
          : '',
      },
      retrait.id_cagnotte,
    );
  }

  // Quand le fournisseur détaille son solde par opérateur (AangaraaPay), un versement Orange ne
  // peut utiliser que le solde Orange (et jamais plus que le solde total).
  private async verifierSolde(
    fournisseur: FournisseurPaiement,
    net: number,
    methode: MethodePaiement,
  ) {
    let solde: SoldeFournisseur;
    try {
      solde = await fournisseur.lireSolde();
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      this.logger.warn(
        `Solde ${fournisseur.libelle} non lu (${e.name} : ${e.message}) : versement non lancé.`,
      );
      throw new ServiceUnavailableException(
        m('retraits.notchPayIndisponible', {
          fournisseur: fournisseur.libelle,
        }),
      );
    }
    const parMethode = solde.parMethode;
    if (parMethode) {
      // Soldes séparés par opérateur : l'admin voit les deux pour savoir lequel recharger.
      const duMoyen = Math.min(parMethode[methode] ?? 0, solde.disponible);
      if (duMoyen < net) {
        throw new BadRequestException(
          m('retraits.soldeInsuffisantOperateur', {
            operateur: methode === 'ORANGE_MONEY' ? 'Orange' : 'MTN',
            net,
            mtn: parMethode.MTN_MOBILE_MONEY ?? 0,
            orange: parMethode.ORANGE_MONEY ?? 0,
            fournisseur: fournisseur.libelle,
          }),
        );
      }
      return;
    }
    const disponible = solde.disponible;
    if (disponible < net) {
      throw new BadRequestException(
        m('retraits.soldeInsuffisant', {
          disponible,
          net,
          fournisseur: fournisseur.libelle,
        }),
      );
    }
  }

  // Consulte le versement chez le fournisseur qui l'a lancé et applique son statut au retrait.
  // Sans effet si le retrait n'est plus APPROUVE. Renvoie le statut du retrait après l'appel.
  // Pour le webhook : propagerErreurTemporaire relance l'erreur quand le fournisseur est injoignable.
  async synchroniserRetrait(
    idRetrait: number,
    options: { propagerErreurTemporaire?: boolean } = {},
  ) {
    const retrait = await this.prisma.retrait.findUnique({
      where: { id_retrait: idRetrait },
    });
    if (!retrait) {
      throw new NotFoundException(m('retraits.introuvable'));
    }
    const reference =
      retrait.reference_fournisseur ?? retrait.reference_retrait;
    if (retrait.statut !== 'APPROUVE' || !reference) return retrait.statut;
    try {
      const fournisseur = this.fournisseurs.get(retrait.fournisseur);
      const versement = await fournisseur.consulterVersement(
        reference,
        retrait.methode_retrait,
      );
      return await this.appliquerStatutVersement(idRetrait, versement);
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      if (e instanceof ErreurIntrouvablePaiement) {
        // Jamais d'échec automatique ici : une relance verserait une seconde fois si le versement
        // existe sous une autre référence.
        this.logger.error(
          `Retrait ${idRetrait} : versement ${reference} inconnu du fournisseur. À vérifier à la main.`,
        );
        await this.alerterUneFois(idRetrait, 'VERSEMENT_INTROUVABLE');
        return retrait.statut;
      }
      this.logger.warn(
        `Retrait ${idRetrait} : versement non consulté (${e.name} : ${e.message}).`,
      );
      if (options.propagerErreurTemporaire && estErreurTemporaire(e)) throw e;
      return retrait.statut;
    }
  }

  // Applique au retrait le statut d'un versement lu chez le fournisseur.
  private async appliquerStatutVersement(
    idRetrait: number,
    versement: OperationFournisseur,
  ) {
    const retrait = await this.prisma.retrait.findUniqueOrThrow({
      where: { id_retrait: idRetrait },
    });
    if (versement.statut === 'ECHOUE') {
      return this.marquerEchoue(
        idRetrait,
        versement.codeErreur ?? versement.statutFournisseur.toUpperCase(),
        versement.messageErreur ??
          `Statut du fournisseur : ${versement.statutFournisseur}`,
        true,
      );
    }
    if (versement.statut !== 'VALIDE') return retrait.statut;

    // Le versement confirmé doit être exactement le net du retrait.
    const net = Number(retrait.montant_net);
    if (
      versement.montant !== undefined &&
      (versement.montant !== net ||
        (versement.devise ?? 'XAF').toUpperCase() !== 'XAF')
    ) {
      this.logger.error(
        `Retrait ${idRetrait} : versement ${versement.referenceFournisseur} d'un montant incohérent (attendu ${net} XAF, reçu ${versement.montant} ${versement.devise ?? ''}). Retrait laissé APPROUVE, à traiter à la main.`,
      );
      return retrait.statut;
    }
    return (await this.finaliser(idRetrait, 'APPROUVE'))?.statut ?? 'TRAITE';
  }

  // APPROUVE → ECHOUE, de façon conditionnelle. L'organisateur est prévenu si le versement a
  // réellement échoué (pas pour un refus immédiat de Notch Pay, que l'admin voit tout de suite).
  private async marquerEchoue(
    idRetrait: number,
    code: string,
    message: string,
    notifier: boolean,
  ) {
    const { count } = await this.prisma.retrait.updateMany({
      where: { id_retrait: idRetrait, statut: 'APPROUVE' },
      data: {
        statut: 'ECHOUE',
        code_erreur: code.slice(0, 100),
        message_erreur: message,
      },
    });
    const retrait = await this.prisma.retrait.findUniqueOrThrow({
      where: { id_retrait: idRetrait },
    });
    if (count > 0) {
      this.logger.warn(
        `Retrait ${idRetrait} : versement échoué (${code} : ${message}).`,
      );
      if (notifier) {
        await this.notifierOrganisateur(retrait, 'RETRAIT_ECHOUE', {
          brut: Number(retrait.montant_brut),
          devise: 'XAF',
        });
      }
    }
    return retrait.statut;
  }

  // Passe le retrait en TRAITE depuis `depuis`, de façon conditionnelle (un seul appel concurrent
  // réussit) : transaction de retrait, registre des commissions, notification à l'organisateur.
  // Renvoie null si un autre appel l'a déjà traité.
  private async finaliser(
    idRetrait: number,
    depuis: 'APPROUVE' | 'EN_ATTENTE' | 'ECHOUE',
    manuel?: { idAdmin: number },
  ) {
    const traite = await this.prisma.$transaction(async (tx) => {
      const retrait = await tx.retrait.findUniqueOrThrow({
        where: { id_retrait: idRetrait },
      });
      const { count } = await tx.retrait.updateMany({
        where: { id_retrait: idRetrait, statut: depuis },
        data: {
          statut: 'TRAITE',
          date_traitement: new Date(),
          ...(manuel
            ? { hors_plateforme: true, traite_par: manuel.idAdmin }
            : {}),
        },
      });
      if (count === 0) return null;

      // Somme réellement versée à l'organisateur : le net.
      await tx.transaction.create({
        data: {
          id_retrait: idRetrait,
          type: 'RETRAIT',
          montant: retrait.montant_net,
          devise: 'XAF',
          statut: 'SUCCES',
        },
      });
      // Registre des commissions : une ligne par retrait versé (sauf commission nulle).
      if (Number(retrait.montant_commission) > 0) {
        await tx.commission.create({
          data: {
            id_retrait: idRetrait,
            id_cagnotte: retrait.id_cagnotte,
            montant: retrait.montant_commission,
            taux: retrait.taux_commission,
          },
        });
      }
      return tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
    });

    if (traite) {
      await this.notifierOrganisateur(traite, 'RETRAIT_TRAITE', {
        brut: Number(traite.montant_brut),
        net: Number(traite.montant_net),
        commission: Number(traite.montant_commission),
        devise: 'XAF',
        numero: traite.numero_beneficiaire,
      });
    }
    return traite;
  }

  // Mode manuel de secours : l'administrateur confirme avoir versé la somme hors plateforme.
  // Le retrait passe en TRAITE sans aucun appel à Notch Pay ; l'action est journalisée.
  // Possible pour un retrait EN_ATTENTE ou ECHOUE, et pour un retrait APPROUVE dont le versement
  // n'a pas de référence Notch Pay (issue inconnue, vérifiée à la main par l'administrateur).
  async traiterHorsPlateforme(idRetrait: number, idAdmin: number) {
    const retrait = await this.prisma.retrait.findUnique({
      where: { id_retrait: idRetrait },
    });
    if (!retrait) {
      throw new NotFoundException(m('retraits.introuvable'));
    }
    if (retrait.statut === 'APPROUVE' && retrait.reference_fournisseur) {
      throw new BadRequestException(m('retraits.versementEnCours'));
    }
    if (retrait.statut === 'TRAITE' || retrait.statut === 'REJETE') {
      throw new BadRequestException(m('retraits.dejaTraite'));
    }
    const traite = await this.finaliser(idRetrait, retrait.statut, { idAdmin });
    if (!traite) {
      throw new BadRequestException(m('retraits.dejaTraite'));
    }
    this.logger.warn(
      `Retrait ${idRetrait} marqué TRAITE hors plateforme par l'administrateur ${idAdmin} (net ${Number(traite.montant_net)} XAF, ${traite.numero_beneficiaire}, statut précédent ${retrait.statut}).`,
    );
    return traite;
  }

  // Rejet d'un retrait EN_ATTENTE, ou d'un retrait dont le versement a échoué.
  async rejeter(idRetrait: number, dto: RejectRetraitDto) {
    const rejete = await this.prisma.$transaction(async (tx) => {
      const retrait = await tx.retrait.findUnique({
        where: { id_retrait: idRetrait },
      });
      if (!retrait) {
        throw new NotFoundException(m('retraits.introuvable'));
      }

      const { count } = await tx.retrait.updateMany({
        where: {
          id_retrait: idRetrait,
          statut: { in: ['EN_ATTENTE', 'ECHOUE'] },
        },
        data: {
          statut: 'REJETE',
          motif_rejet: dto.motif_rejet,
          date_traitement: new Date(),
        },
      });
      if (count === 0) {
        throw new BadRequestException(m('retraits.dejaTraite'));
      }

      return tx.retrait.findUnique({ where: { id_retrait: idRetrait } });
    });

    if (rejete) {
      await this.notifierOrganisateur(rejete, 'RETRAIT_REJETE', {
        brut: Number(rejete.montant_brut),
        devise: 'XAF',
        motif: rejete.motif_rejet?.trim() ?? '',
      });
    }
    return rejete;
  }

  // Réconciliation (tâche planifiée) : retraits APPROUVE depuis plus de 5 minutes.
  async reconcilierVersements(maintenant = new Date()) {
    const retraits = await this.prisma.retrait.findMany({
      where: {
        statut: 'APPROUVE',
        date_validation: {
          lt: new Date(maintenant.getTime() - DELAI_RECONCILIATION_RETRAITS_MS),
        },
      },
      select: { id_retrait: true },
      orderBy: { date_validation: 'asc' },
      take: LOT_RECONCILIATION,
    });
    const resultat = { consultes: 0, traites: 0, echoues: 0 };
    for (const { id_retrait } of retraits) {
      resultat.consultes += 1;
      try {
        const statut = await this.synchroniserRetrait(id_retrait);
        if (statut === 'TRAITE') resultat.traites += 1;
        if (statut === 'ECHOUE') resultat.echoues += 1;
      } catch (e) {
        this.logger.error(
          `Réconciliation du retrait ${id_retrait} impossible`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }
    return resultat;
  }

  // Contient les numéros de téléphone des bénéficiaires : réservé au propriétaire ou à un admin.
  async listerParCagnotte(
    idCagnotte: number,
    idUtilisateur: number,
    estAdmin: boolean,
  ) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: idCagnotte },
      select: { id_utilisateur: true },
    });
    if (!cagnotte) {
      throw new NotFoundException(m('cagnottes.introuvable'));
    }
    if (cagnotte.id_utilisateur !== idUtilisateur && !estAdmin) {
      throw new ForbiddenException(m('cagnottes.pasProprietaire'));
    }

    return this.prisma.retrait.findMany({
      where: { id_cagnotte: idCagnotte },
      orderBy: { date_creation: 'desc' },
    });
  }

  async listerToutes(dto: ListerRetraitsDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where = dto.statut ? { statut: dto.statut } : {};
    const [donnees, total] = await this.prisma.$transaction([
      this.prisma.retrait.findMany({
        where,
        include: {
          cagnotte: { select: { titre: true, devise: true } },
          utilisateur: { select: { nom: true, prenom: true, email: true } },
        },
        orderBy: [
          { statut: 'asc' },
          { date_creation: 'desc' },
          { id_retrait: 'desc' },
        ],
        skip,
        take,
      }),
      this.prisma.retrait.count({ where }),
    ]);
    return construirePage(donnees, total, page, limite);
  }
}
