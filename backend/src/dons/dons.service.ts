import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDonDto } from './dto/create-don.dto';
import {
  PaginationDto,
  construirePage,
  lirePagination,
} from '../common/pagination';
import { estEchue } from '../common/dates';
import {
  CagnottesService,
  UtilisateurVisiteur,
} from '../cagnottes/cagnottes.service';
import { m } from '../i18n/messages';
import { NotchPayClient } from '../payment/notchpay.client';
import {
  ErreurIntrouvableNotchPay,
  ErreurLimiteNotchPay,
  ErreurNotchPay,
  ErreurReponseNotchPay,
  ErreurReseauNotchPay,
  ErreurServeurNotchPay,
} from '../payment/notchpay.erreurs';
import type { PaiementNotchPay } from '../payment/notchpay.reponses';
import {
  canalNotchPay,
  erreurMobileMoney,
  genererReference,
  normaliserNumero,
  statutDepuisNotchPay,
  type MethodePaiement,
} from '../payment/notchpay.utilitaires';

// Tentatives de don par utilisateur : 5 au plus par tranche de 10 minutes (recommandations
// anti-fraude de Notch Pay).
export const TENTATIVES_MAX = 5;
export const FENETRE_TENTATIVES_MS = 10 * 60 * 1000;

// Code d'erreur interne : paiement validé chez Notch Pay pour un montant ou une devise différents
// de ceux du don.
export const CODE_MONTANT_INCOHERENT = 'MONTANT_INCOHERENT';

// Code d'erreur retenu quand Notch Pay renvoie un statut final d'échec sans code.
const CODES_PAR_STATUT: Record<string, string | undefined> = {
  canceled: 'CANCELLED_BY_USER',
  cancelled: 'CANCELLED_BY_USER',
  expired: 'TIMEOUT',
};

// Erreur après laquelle on ne sait pas si le paiement existe chez Notch Pay : injoignable, 5xx,
// trop de requêtes ou réponse illisible. Le don reste alors EN_ATTENTE.
function estErreurTemporaire(erreur: ErreurNotchPay): boolean {
  return (
    erreur instanceof ErreurReseauNotchPay ||
    erreur instanceof ErreurServeurNotchPay ||
    erreur instanceof ErreurLimiteNotchPay ||
    erreur instanceof ErreurReponseNotchPay
  );
}

@Injectable()
export class DonsService {
  private readonly logger = new Logger(DonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cagnottesService: CagnottesService,
    private readonly notchPay: NotchPayClient,
  ) {}

  async creer(idUtilisateur: number, dto: CreateDonDto) {
    const cagnotte = await this.prisma.cagnotte.findUnique({
      where: { id_cagnotte: dto.id_cagnotte },
    });
    if (!cagnotte) {
      throw new NotFoundException(m('cagnottes.introuvable'));
    }
    // Seule une cagnotte ACTIVE reçoit des dons : jamais une cagnotte en vérification, refusée ou
    // suspendue. Ce contrôle précède tout appel au module de paiement.
    if (cagnotte.statut !== 'ACTIVE') {
      throw new BadRequestException(
        ['EN_VERIFICATION', 'REFUSEE', 'SUSPENDUE'].includes(cagnotte.statut)
          ? m('dons.horsLigne')
          : m('dons.plusDeDons'),
      );
    }
    // Même règle que la tâche nocturne : dons possibles jusqu'à minuit (Douala) au soir de date_fin.
    if (estEchue(cagnotte.date_fin)) {
      throw new BadRequestException(m('dons.cagnotteTerminee'));
    }

    const numero = normaliserNumero(dto.numero_payeur);
    if (!numero) {
      throw new BadRequestException(
        m('validation.numeroMobileMoney', {
          champ: { cle: 'champs.telephone' },
        }),
      );
    }
    await this.refuserSiTropDeTentatives(idUtilisateur);

    const donateur = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: idUtilisateur },
      select: { nom: true, prenom: true, email: true },
    });
    if (!donateur) {
      throw new NotFoundException(m('utilisateurs.introuvable'));
    }
    const canal = canalNotchPay(dto.methode_paiement as MethodePaiement);

    // Le don et son paiement sont créés EN_ATTENTE avant tout appel à Notch Pay. Notre référence
    // contient l'identifiant du don, connu seulement après sa création.
    const { don, reference } = await this.prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.create({
        data: {
          montant: dto.montant,
          methode_paiement: dto.methode_paiement as MethodePaiement,
          numero_payeur: numero,
          canal,
          reference: genererReference('DON'),
          id_utilisateur: idUtilisateur,
        },
      });
      const cree = await tx.don.create({
        data: {
          id_cagnotte: cagnotte.id_cagnotte,
          id_utilisateur: idUtilisateur,
          id_paiement: paiement.id_paiement,
          message: dto.message,
          est_anonyme: dto.est_anonyme ?? false,
        },
      });
      const referenceDon = `SOLIFUND-DON-${cree.id_don}`;
      await tx.paiement.update({
        where: { id_paiement: paiement.id_paiement },
        data: { reference: referenceDon },
      });
      return { don: cree, reference: referenceDon };
    });

    try {
      const initialise = await this.notchPay.initialiserPaiement({
        montant: dto.montant,
        devise: 'XAF',
        reference,
        description: `Don pour ${cagnotte.titre}`,
        client: {
          nom: `${donateur.prenom} ${donateur.nom}`.trim(),
          email: donateur.email,
          telephone: numero,
        },
      });
      await this.prisma.paiement.update({
        where: { id_paiement: don.id_paiement },
        data: { reference_notchpay: initialise.reference },
      });
      const traite = await this.notchPay.traiterPaiement(
        initialise.reference,
        canal,
        numero,
      );
      // Le plus souvent « en cours » : le donateur doit confirmer sur son téléphone. Un refus
      // immédiat (statut final) est appliqué tout de suite.
      await this.appliquerStatutNotchPay(don.id_don, traite);
    } catch (e) {
      if (!(e instanceof ErreurNotchPay)) throw e;
      if (estErreurTemporaire(e)) {
        // Notch Pay injoignable ou en erreur après les nouveaux essais : on ne sait pas si le
        // paiement a été créé. Le don reste EN_ATTENTE ; la réconciliation tranchera.
        this.logger.warn(
          `Don ${don.id_don} : Notch Pay indisponible (${e.name} : ${e.message}), laissé EN_ATTENTE.`,
        );
      } else {
        // Refus définitif (numéro, canal, référence, clés...) : le don ne reste pas EN_ATTENTE.
        this.logger.warn(
          `Don ${don.id_don} : paiement refusé par Notch Pay (${e.code ?? e.name} : ${e.message}).`,
        );
        await this.appliquerEchec(
          don.id_don,
          don.id_paiement,
          e.code ?? e.name,
          e.message,
        );
      }
    }
    return this.etatDon(don.id_don);
  }

  // Limite anti-fraude par utilisateur (en plus de la limite par adresse IP du contrôleur).
  private async refuserSiTropDeTentatives(idUtilisateur: number) {
    const recents = await this.prisma.don.count({
      where: {
        id_utilisateur: idUtilisateur,
        date_creation: { gte: new Date(Date.now() - FENETRE_TENTATIVES_MS) },
      },
    });
    if (recents >= TENTATIVES_MAX) {
      throw new HttpException(
        m('dons.tropDeTentatives'),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // État d'un don tel que renvoyé au donateur (création et vérification) : statut, et pour un
  // échec le message lisible et la possibilité de réessayer.
  private async etatDon(idDon: number) {
    const don = await this.prisma.don.findUniqueOrThrow({
      where: { id_don: idDon },
      include: { paiement: true },
    });
    const etat = {
      id_don: don.id_don,
      statut: don.statut,
      montant: Number(don.paiement.montant),
      devise: don.paiement.devise,
    };
    if (don.statut !== 'ECHOUE') return etat;
    const code = don.paiement.code_erreur;
    if (code === CODE_MONTANT_INCOHERENT) {
      return {
        ...etat,
        code_erreur: code,
        message: m('paiement.MONTANT_INCOHERENT'),
        peut_reessayer: false,
      };
    }
    const erreur = erreurMobileMoney(code);
    return {
      ...etat,
      code_erreur: erreur.code ?? code,
      message: erreur.message,
      peut_reessayer: erreur.peutReessayer,
    };
  }

  // POST /dons/:id/verifier-statut : consulte Notch Pay pour un don encore en attente.
  async verifierStatutDon(
    idDon: number,
    idUtilisateur: number,
    estAdmin: boolean,
  ) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      select: { id_utilisateur: true, statut: true },
    });
    if (!don) {
      throw new NotFoundException(m('dons.introuvable'));
    }
    if (don.id_utilisateur !== idUtilisateur && !estAdmin) {
      throw new ForbiddenException();
    }
    if (don.statut === 'EN_ATTENTE') {
      await this.synchroniserDon(idDon);
    }
    return this.etatDon(idDon);
  }

  // Consulte le paiement chez Notch Pay et applique son statut au don. Sans effet si le don n'est
  // plus EN_ATTENTE, si Notch Pay est injoignable ou s'il ne connaît pas ce paiement : un don
  // n'échoue jamais sans statut final d'échec. Renvoie le statut du don après l'appel.
  async synchroniserDon(idDon: number) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true },
    });
    if (!don) {
      throw new NotFoundException(m('dons.introuvable'));
    }
    if (don.statut !== 'EN_ATTENTE') return don.statut;
    try {
      const paiement = await this.notchPay.consulterPaiement(
        don.paiement.reference_notchpay ?? don.paiement.reference,
      );
      return await this.appliquerStatutNotchPay(idDon, paiement);
    } catch (e) {
      if (!(e instanceof ErreurNotchPay)) throw e;
      this.logger.warn(
        `Don ${idDon} : statut non consulté (${e.name} : ${e.message}).`,
      );
      return don.statut;
    }
  }

  // Réconciliation : don resté sans statut final trop longtemps. Le paiement est annulé chez
  // Notch Pay, puis le don passe en ECHOUE. Si Notch Pay refuse l'annulation (le paiement vient
  // peut-être d'aboutir), le statut est relu ; s'il est injoignable, rien ne change.
  async abandonnerDon(idDon: number) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true },
    });
    if (!don || don.statut !== 'EN_ATTENTE') return don?.statut ?? null;
    try {
      await this.notchPay.annulerPaiement(
        don.paiement.reference_notchpay ?? don.paiement.reference,
      );
    } catch (e) {
      if (!(e instanceof ErreurNotchPay)) throw e;
      if (estErreurTemporaire(e)) return don.statut;
      // Paiement inconnu de Notch Pay : il n'a jamais été créé, rien à annuler.
      if (!(e instanceof ErreurIntrouvableNotchPay)) {
        const statut = await this.synchroniserDon(idDon);
        if (statut === 'EN_ATTENTE') {
          this.logger.warn(
            `Don ${idDon} : annulation refusée par Notch Pay (${e.message}), toujours sans statut final.`,
          );
        }
        return statut;
      }
    }
    return this.appliquerEchec(
      idDon,
      don.id_paiement,
      'TIMEOUT',
      'Paiement annulé : aucun statut final après 30 minutes.',
    );
  }

  // Applique au don le statut d'un paiement lu chez Notch Pay. Renvoie le statut du don ensuite.
  private async appliquerStatutNotchPay(
    idDon: number,
    paiement: PaiementNotchPay,
  ) {
    const don = await this.prisma.don.findUniqueOrThrow({
      where: { id_don: idDon },
      include: { paiement: true },
    });
    const statut = statutDepuisNotchPay(paiement.statut);

    if (statut === 'ECHOUE') {
      return this.appliquerEchec(
        idDon,
        don.id_paiement,
        paiement.codeErreur ?? CODES_PAR_STATUT[paiement.statut.toLowerCase()],
        paiement.messageErreur ?? `Statut Notch Pay : ${paiement.statut}`,
      );
    }
    if (statut !== 'VALIDE') return don.statut;

    // Avant de valider : le paiement encaissé doit être exactement celui du don.
    const attendu = Number(don.paiement.montant);
    if (paiement.montant === undefined || !paiement.devise) {
      this.logger.error(
        `Don ${idDon} : paiement validé chez Notch Pay mais montant ou devise absents de la réponse. Don laissé EN_ATTENTE, à vérifier.`,
      );
      return don.statut;
    }
    if (
      paiement.montant !== attendu ||
      paiement.devise.toUpperCase() !== don.paiement.devise.toUpperCase()
    ) {
      this.logger.error(
        `Don ${idDon} : montant incohérent. Attendu ${attendu} ${don.paiement.devise}, reçu ${paiement.montant} ${paiement.devise} (référence ${paiement.reference}). Don non validé, à traiter à la main.`,
      );
      return this.appliquerEchec(
        idDon,
        don.id_paiement,
        CODE_MONTANT_INCOHERENT,
        `Attendu ${attendu} ${don.paiement.devise}, reçu ${paiement.montant} ${paiement.devise}.`,
      );
    }
    const resultat = await this.appliquerValidation(idDon);
    return resultat.valide ? ('VALIDE' as const) : resultat.statut;
  }

  // Endpoint admin : même comportement visible qu'avant (erreur si le don est déjà validé).
  async validerPaiement(idDon: number) {
    const resultat = await this.appliquerValidation(idDon);
    if (!resultat.valide) {
      if (resultat.statut === 'VALIDE') {
        throw new BadRequestException(m('dons.dejaValide'));
      }
      throw new BadRequestException(
        m('dons.nonValidable', { statut: resultat.statut }),
      );
    }
    return resultat.don;
  }

  // Valide le don de façon atomique. Renvoie valide: false si un autre appel l'a déjà traité
  // (webhook et vérification de statut simultanés, double clic admin...), sans aucun effet de bord.
  private async appliquerValidation(idDon: number) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true, cagnotte: true },
    });
    if (!don) {
      throw new NotFoundException(m('dons.introuvable'));
    }

    const donValide = await this.prisma.$transaction(async (tx) => {
      // Passage conditionnel EN_ATTENTE -> VALIDE : un seul appel concurrent peut obtenir count === 1.
      const { count } = await tx.don.updateMany({
        where: { id_don: idDon, statut: 'EN_ATTENTE' },
        data: { statut: 'VALIDE' },
      });
      if (count === 0) {
        return null;
      }

      await tx.paiement.update({
        where: { id_paiement: don.id_paiement },
        data: { statut: 'VALIDE' },
      });

      await tx.cagnotte.update({
        where: { id_cagnotte: don.id_cagnotte },
        data: { montant_collecte: { increment: don.paiement.montant } },
      });

      await tx.transaction.create({
        data: {
          id_paiement: don.id_paiement,
          type: 'DON',
          montant: don.paiement.montant,
          devise: don.paiement.devise,
          statut: 'SUCCES',
        },
      });

      return tx.don.findUnique({ where: { id_don: idDon } });
    });

    if (!donValide) {
      const actuel = await this.prisma.don.findUnique({
        where: { id_don: idDon },
        select: { statut: true },
      });
      return { valide: false as const, statut: actuel?.statut ?? don.statut };
    }

    await this.notificationsService.envoyer(
      don.cagnotte.id_utilisateur,
      'DON_RECU',
      {
        montant: Number(don.paiement.montant),
        devise: don.paiement.devise,
        titre: don.cagnotte.titre,
      },
      'DON',
      don.cagnotte.id_cagnotte,
    );

    return { valide: true as const, don: donValide };
  }

  // Passe le don et son paiement en ECHOUE, seulement s'ils sont encore EN_ATTENTE (même principe que
  // appliquerValidation) : un don déjà validé ne peut jamais redevenir « échoué ».
  // Enregistre la raison de l'échec (code et message) dans le paiement.
  // Renvoie le statut du don après l'appel.
  private async appliquerEchec(
    idDon: number,
    idPaiement: number,
    codeErreur?: string,
    messageErreur?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.don.updateMany({
        where: { id_don: idDon, statut: 'EN_ATTENTE' },
        data: { statut: 'ECHOUE' },
      });
      if (count === 0) {
        const actuel = await tx.don.findUnique({
          where: { id_don: idDon },
          select: { statut: true },
        });
        return actuel?.statut ?? 'ECHOUE';
      }
      await tx.paiement.updateMany({
        where: { id_paiement: idPaiement, statut: 'EN_ATTENTE' },
        data: {
          statut: 'ECHOUE',
          code_erreur: codeErreur?.slice(0, 100),
          message_erreur: messageErreur,
        },
      });
      return 'ECHOUE' as const;
    });
  }

  // Liste publique : aucun identifiant interne, et aucun nom pour les dons anonymes.
  // Même règle de visibilité que GET /cagnottes/:id (404 pour une cagnotte masquée).
  async listerParCagnotte(
    idCagnotte: number,
    dto: PaginationDto,
    utilisateur: UtilisateurVisiteur,
  ) {
    await this.cagnottesService.trouverVisible(idCagnotte, utilisateur);
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const where = { id_cagnotte: idCagnotte, statut: 'VALIDE' as const };
    const [dons, total] = await this.prisma.$transaction([
      this.prisma.don.findMany({
        where,
        select: {
          id_don: true,
          message: true,
          est_anonyme: true,
          date_creation: true,
          paiement: { select: { montant: true, devise: true } },
          utilisateur: { select: { nom: true, prenom: true } },
        },
        orderBy: [{ date_creation: 'desc' }, { id_don: 'desc' }],
        skip,
        take,
      }),
      this.prisma.don.count({ where }),
    ]);

    const donnees = dons.map((don) => {
      const visible = !don.est_anonyme && don.utilisateur;
      return {
        id_don: don.id_don,
        montant: don.paiement.montant,
        devise: don.paiement.devise,
        message: don.message,
        date_creation: don.date_creation,
        est_anonyme: don.est_anonyme,
        donateur: {
          nom: visible ? don.utilisateur!.nom : null,
          prenom: visible ? don.utilisateur!.prenom : null,
        },
      };
    });
    return construirePage(donnees, total, page, limite);
  }

  async listerTous() {
    return this.prisma.don.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: {
        cagnotte: { select: { titre: true, devise: true } },
        utilisateur: { select: { nom: true, prenom: true, email: true } },
        paiement: {
          select: {
            montant: true,
            methode_paiement: true,
            numero_payeur: true,
          },
        },
      },
      orderBy: { date_creation: 'desc' },
    });
  }
}
