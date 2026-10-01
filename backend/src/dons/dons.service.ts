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
import { FournisseursPaiement } from '../payment/fournisseurs-paiement.service';
import type {
  FournisseurPaiement,
  OperationFournisseur,
} from '../payment/fournisseur-paiement';
import {
  ErreurIntrouvablePaiement,
  ErreurPaiement,
  estErreurTemporaire,
} from '../payment/paiement.erreurs';
import {
  OPERATEURS_MOBILE_MONEY,
  numeroIncoherent,
} from '../config/operateurs-mobile-money';
import { calculerFraisDon } from '../config/frais-transaction';
import { derniereVerification } from '../verification-identite/identite';
import { CalculerFraisDto } from './dto/calculer-frais.dto';
import {
  codeErreurDepuisMessage,
  erreurMobileMoney,
  genererReference,
  normaliserNumero,
  type MethodePaiement,
} from '../payment/notchpay.utilitaires';

// Tentatives de don par utilisateur : 5 au plus par tranche de 10 minutes (recommandations
// anti-fraude de Notch Pay).
export const TENTATIVES_MAX = 5;
export const FENETRE_TENTATIVES_MS = 10 * 60 * 1000;

// Code d'erreur interne : paiement validé chez le fournisseur pour un montant ou une devise différents
// de ceux du don.
export const CODE_MONTANT_INCOHERENT = 'MONTANT_INCOHERENT';

// Code d'erreur interne : le fournisseur n'a pas répondu à la création du don, et le paiement a été
// annulé (ou la demande n'est jamais partie). Aucun argent n'a pu bouger.
export const CODE_SERVICE_INDISPONIBLE = 'SERVICE_INDISPONIBLE';

// Code d'erreur interne : paiement confirmé pour un autre numéro que celui du don.
export const CODE_PAYEUR_INCOHERENT = 'PAYEUR_INCOHERENT';

// Échecs décidés par SoliFund faute de réponse du fournisseur : un paiement confirmé plus tard
// valide quand même le don (voir synchroniserDon, succesTardif).
const CODES_SANS_REPONSE = ['TIMEOUT', 'SERVICE_INDISPONIBLE'];

// Fournisseur sans annulation : délai au-delà duquel un paiement toujours en attente est abandonné.
export const DELAI_ABANDON_SANS_ANNULATION_MS = 24 * 60 * 60 * 1000;

// Code d'erreur retenu quand le fournisseur renvoie un statut final d'échec sans code.
const CODES_PAR_STATUT: Record<string, string | undefined> = {
  canceled: 'CANCELLED_BY_USER',
  cancelled: 'CANCELLED_BY_USER',
  expired: 'TIMEOUT',
};

@Injectable()
export class DonsService {
  private readonly logger = new Logger(DonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cagnottesService: CagnottesService,
    private readonly fournisseurs: FournisseursPaiement,
  ) {}

  // Opérateur de retrait VÉRIFIÉ de l'organisateur (dernière vérification d'identité validée), ou
  // null s'il n'est pas encore connu.
  private async methodeRetraitOrganisateur(
    idOrganisateur: number,
  ): Promise<MethodePaiement | null> {
    const identite = await derniereVerification(this.prisma, idOrganisateur);
    return identite?.statut === 'VALIDEE' ? identite.methode_retrait : null;
  }

  // Frais d'un don, avant l'envoi (route publique) : même calcul qu'à la création du don.
  async calculerFrais(dto: CalculerFraisDto, utilisateur: UtilisateurVisiteur) {
    const cagnotte = await this.cagnottesService.trouverVisible(
      dto.id_cagnotte,
      utilisateur,
    );
    const frais = calculerFraisDon(
      dto.montant,
      dto.methode_paiement,
      await this.methodeRetraitOrganisateur(cagnotte.id_utilisateur),
    );
    return { ...frais, devise: 'XAF' };
  }

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
    // Numéro d'un autre opérateur que celui choisi (préfixes : src/config/operateurs-mobile-money.ts).
    const autreOperateur = numeroIncoherent(numero, dto.methode_paiement);
    if (autreOperateur) {
      throw new BadRequestException(
        m('paiement.numeroAutreOperateur', {
          operateur: OPERATEURS_MOBILE_MONEY[autreOperateur].nom,
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
    const methode = dto.methode_paiement as MethodePaiement;
    // Fournisseur actif (PAIEMENT_FOURNISSEUR) : il traitera ce paiement jusqu'au bout.
    const fournisseur = this.fournisseurs.actif();
    // Frais de transaction à la charge du donateur : le total (don + frais) est demandé au
    // fournisseur ; seul le don sera ajouté à la cagnotte.
    const frais = calculerFraisDon(
      dto.montant,
      methode,
      await this.methodeRetraitOrganisateur(cagnotte.id_utilisateur),
    );

    // Le don et son paiement sont créés EN_ATTENTE avant tout appel au fournisseur. Notre
    // référence contient l'identifiant du don, connu seulement après sa création.
    const { don, reference } = await this.prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.create({
        data: {
          montant: frais.montant_total,
          methode_paiement: methode,
          numero_payeur: numero,
          fournisseur: fournisseur.nom,
          canal: fournisseur.canal(methode),
          reference: genererReference('DON'),
          id_utilisateur: idUtilisateur,
        },
      });
      const cree = await tx.don.create({
        data: {
          id_cagnotte: cagnotte.id_cagnotte,
          id_utilisateur: idUtilisateur,
          id_paiement: paiement.id_paiement,
          montant_don: frais.montant_don,
          montant_frais: frais.montant_frais,
          montant_total: frais.montant_total,
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

    // Vrai quand le fournisseur a accepté d'envoyer la demande de paiement sur le téléphone.
    let demandeEnvoyee = false;
    try {
      const resultat = await fournisseur.initierPaiement({
        montant: frais.montant_total,
        devise: 'XAF',
        reference,
        description: `Don pour ${cagnotte.titre}`,
        methode,
        numero,
        client: {
          nom: `${donateur.prenom} ${donateur.nom}`.trim(),
          email: donateur.email,
        },
      });
      await this.enregistrerOperation(don.id_paiement, resultat);
      demandeEnvoyee = resultat.demandeEnvoyee;
      // Le plus souvent « en attente » : le donateur doit confirmer sur son téléphone. Un refus
      // immédiat (statut final) est appliqué tout de suite.
      await this.appliquerStatutFournisseur(don.id_don, resultat);
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      if (e.referenceFournisseur) {
        await this.prisma.paiement.update({
          where: { id_paiement: don.id_paiement },
          data: { reference_fournisseur: e.referenceFournisseur },
        });
      }
      if (estErreurTemporaire(e)) {
        // Fournisseur injoignable ou en erreur après les nouveaux essais.
        await this.abandonnerApresIndisponibilite(
          don.id_don,
          don.id_paiement,
          fournisseur,
          e,
        );
        const etat = await this.etatDon(don.id_don);
        return {
          ...etat,
          // Statut propre à cette réponse : la demande n'a pas pu être envoyée à l'opérateur.
          statut: 'INDISPONIBLE' as const,
          demande_envoyee: false,
          peut_reessayer: true,
          // Paiement annulé ou jamais envoyé : aucun montant prélevé. Sinon on ne peut pas
          // l'affirmer, et le donateur ne doit pas valider une demande qui arriverait.
          message:
            etat.statut === 'ECHOUE'
              ? m('paiement.SERVICE_INDISPONIBLE')
              : m('paiement.SERVICE_INCERTAIN'),
        };
      }
      // Refus définitif (numéro, canal, référence, clés...) : le don ne reste pas EN_ATTENTE.
      // Le message du fournisseur (et ses erreurs par champ) est gardé tel quel ; s'il est reconnu
      // (« Invalid CM Mobile Money »...), le code Mobile Money correspondant est enregistré.
      const detail = [e.message, ...Object.values(e.erreursChamps ?? {}).flat()]
        .filter((texte) => texte)
        .join(' ');
      const code = codeErreurDepuisMessage(detail) ?? e.code ?? e.name;
      this.logger.warn(
        `Don ${don.id_don} : paiement refusé par ${fournisseur.nom} (HTTP ${e.statutHttp ?? '-'}, code ${code}) : ${detail}`,
      );
      await this.appliquerEchec(don.id_don, don.id_paiement, code, detail);
    }
    return {
      ...(await this.etatDon(don.id_don)),
      demande_envoyee: demandeEnvoyee,
    };
  }

  // Garde dans le paiement ce que le fournisseur a renvoyé : sa référence, son statut et la raison
  // donnée par l'opérateur.
  private async enregistrerOperation(
    idPaiement: number,
    operation: OperationFournisseur,
  ) {
    await this.prisma.paiement.update({
      where: { id_paiement: idPaiement },
      data: {
        reference_fournisseur: operation.referenceFournisseur,
        statut_operateur: operation.statutFournisseur.slice(0, 50),
        raison_operateur: operation.messageErreur ?? null,
      },
    });
  }

  // Le fournisseur n'a pas répondu (ou a répondu 5xx) pendant la création du don.
  // - La demande n'a pas pu partir vers le téléphone (Notch Pay : échec à l'initialisation) :
  //   aucun argent n'a pu bouger, le don passe en ECHOUE (SERVICE_INDISPONIBLE).
  // - Elle a pu partir : si le fournisseur permet d'annuler et que l'annulation réussit, plus aucun
  //   argent ne peut bouger : ECHOUE. Sinon le don reste EN_ATTENTE, la réconciliation (ou le
  //   webhook) tranchera.
  private async abandonnerApresIndisponibilite(
    idDon: number,
    idPaiement: number,
    fournisseur: FournisseurPaiement,
    erreur: ErreurPaiement,
  ) {
    const reference = erreur.referenceFournisseur;
    if (erreur.demandePeutEtrePartie) {
      if (!reference || !fournisseur.peutAnnuler) {
        this.logger.warn(
          `Don ${idDon} : ${fournisseur.nom} indisponible (${erreur.message}), la demande a peut-être été envoyée. Don laissé EN_ATTENTE.`,
        );
        return;
      }
      try {
        await fournisseur.annulerPaiement(reference);
      } catch (e) {
        if (!(e instanceof ErreurPaiement)) throw e;
        this.logger.warn(
          `Don ${idDon} : ${fournisseur.nom} indisponible (${erreur.message}) et annulation impossible (${e.name} : ${e.message}). Don laissé EN_ATTENTE pour la réconciliation.`,
        );
        return;
      }
    }
    this.logger.warn(
      `Don ${idDon} : ${fournisseur.nom} indisponible (${erreur.name} : ${erreur.message}). ${erreur.demandePeutEtrePartie ? 'Paiement annulé' : 'Aucune demande envoyée'} : don passé en ECHOUE.`,
    );
    await this.appliquerEchec(
      idDon,
      idPaiement,
      CODE_SERVICE_INDISPONIBLE,
      erreur.message,
    );
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
      montant: Number(don.montant_don),
      montant_frais: Number(don.montant_frais),
      montant_total: Number(don.montant_total),
      devise: don.paiement.devise,
    };
    if (don.statut !== 'ECHOUE') return etat;
    const code = don.paiement.code_erreur;
    if (code === CODE_SERVICE_INDISPONIBLE) {
      return {
        ...etat,
        code_erreur: code,
        message: m('paiement.SERVICE_INDISPONIBLE'),
        peut_reessayer: true,
      };
    }
    if (code === CODE_MONTANT_INCOHERENT || code === CODE_PAYEUR_INCOHERENT) {
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

  // POST /dons/:id/verifier-statut : consulte le fournisseur pour un don encore en attente.
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

  // Consulte le paiement chez son fournisseur et applique son statut au don. Sans effet si le don
  // n'est plus EN_ATTENTE, si le fournisseur est injoignable ou s'il ne connaît pas ce paiement :
  // un don n'échoue jamais sans statut final d'échec. Renvoie le statut du don après l'appel.
  // Options (webhooks) :
  // - propagerErreurTemporaire relance l'erreur quand le fournisseur est injoignable, afin de
  //   répondre 500 et de recevoir l'événement à nouveau ;
  // - succesTardif accepte de valider un don déjà passé en ECHOUE faute de réponse (TIMEOUT,
  //   SERVICE_INDISPONIBLE) si le fournisseur confirme finalement le paiement : l'argent est reçu.
  async synchroniserDon(
    idDon: number,
    options: {
      propagerErreurTemporaire?: boolean;
      succesTardif?: boolean;
    } = {},
  ) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true },
    });
    if (!don) {
      throw new NotFoundException(m('dons.introuvable'));
    }
    const echecSansReponse =
      don.statut === 'ECHOUE' &&
      CODES_SANS_REPONSE.includes(don.paiement.code_erreur ?? '');
    if (
      don.statut !== 'EN_ATTENTE' &&
      !(options.succesTardif && echecSansReponse)
    ) {
      return don.statut;
    }
    const reference = don.paiement.reference_fournisseur;
    if (!reference) return don.statut;
    try {
      const fournisseur = this.fournisseurs.get(don.paiement.fournisseur);
      const operation = await fournisseur.consulterPaiement(reference);
      await this.enregistrerOperation(don.id_paiement, operation);
      return await this.appliquerStatutFournisseur(idDon, operation, {
        succesTardif: echecSansReponse,
      });
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      this.logger.warn(
        `Don ${idDon} : statut non consulté (${e.name} : ${e.message}).`,
      );
      if (options.propagerErreurTemporaire && estErreurTemporaire(e)) throw e;
      return don.statut;
    }
  }

  // Réconciliation : don resté sans statut final plus de 30 minutes.
  // - Fournisseur qui permet d'annuler (Notch Pay) : le paiement est annulé, puis le don passe en
  //   ECHOUE. Si l'annulation est refusée (le paiement vient peut-être d'aboutir), le statut est
  //   relu ; si le fournisseur est injoignable, rien ne change.
  // - Fournisseur sans annulation (AangaraaPay) : on attend son statut final ; le don n'échoue
  //   qu'après 24 heures sans réponse (TIMEOUT, avec un log d'erreur à vérifier).
  // - Aucune référence chez le fournisseur (sa réponse n'est jamais arrivée) : ECHOUE (TIMEOUT).
  //   Un paiement confirmé plus tard par webhook validera quand même le don (succesTardif).
  async abandonnerDon(idDon: number, maintenant = new Date()) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true },
    });
    if (!don || don.statut !== 'EN_ATTENTE') return don?.statut ?? null;
    const reference = don.paiement.reference_fournisseur;
    if (!reference) {
      return this.appliquerEchec(
        idDon,
        don.id_paiement,
        'TIMEOUT',
        'Aucune réponse du fournisseur après 30 minutes.',
      );
    }
    let fournisseur: FournisseurPaiement;
    try {
      fournisseur = this.fournisseurs.get(don.paiement.fournisseur);
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      this.logger.error(`Don ${idDon} : ${e.message}`);
      return don.statut;
    }

    if (!fournisseur.peutAnnuler) {
      const age = maintenant.getTime() - don.date_creation.getTime();
      if (age < DELAI_ABANDON_SANS_ANNULATION_MS) return don.statut;
      this.logger.error(
        `Don ${idDon} : toujours sans statut final chez ${fournisseur.nom} après 24 heures (référence ${reference}). Passé en ECHOUE, à vérifier chez le fournisseur.`,
      );
      return this.appliquerEchec(
        idDon,
        don.id_paiement,
        'TIMEOUT',
        'Aucun statut final du fournisseur après 24 heures.',
      );
    }

    try {
      await fournisseur.annulerPaiement(reference);
    } catch (e) {
      if (!(e instanceof ErreurPaiement)) throw e;
      if (estErreurTemporaire(e)) return don.statut;
      // Paiement inconnu du fournisseur : il n'a jamais été créé, rien à annuler.
      if (!(e instanceof ErreurIntrouvablePaiement)) {
        const statut = await this.synchroniserDon(idDon);
        if (statut === 'EN_ATTENTE') {
          this.logger.warn(
            `Don ${idDon} : annulation refusée par ${fournisseur.nom} (${e.message}), toujours sans statut final.`,
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

  // Applique au don le statut d'une opération lue chez le fournisseur. Renvoie le statut du don.
  private async appliquerStatutFournisseur(
    idDon: number,
    operation: OperationFournisseur,
    options: { succesTardif?: boolean } = {},
  ) {
    const don = await this.prisma.don.findUniqueOrThrow({
      where: { id_don: idDon },
      include: { paiement: true },
    });

    if (operation.statut === 'ECHOUE') {
      return this.enregistrerEchecFournisseur(
        idDon,
        don.id_paiement,
        operation,
      );
    }
    if (operation.statut !== 'VALIDE') return don.statut;

    // Avant de valider : le paiement encaissé doit être exactement le total du don (don + frais).
    const attendu = Number(don.montant_total);
    if (operation.montant === undefined || !operation.devise) {
      this.logger.error(
        `Don ${idDon} : paiement validé chez le fournisseur mais montant ou devise absents de la réponse. Don laissé ${don.statut}, à vérifier.`,
      );
      return don.statut;
    }
    if (
      operation.montant !== attendu ||
      operation.devise.toUpperCase() !== don.paiement.devise.toUpperCase()
    ) {
      this.logger.error(
        `Don ${idDon} : montant incohérent. Attendu ${attendu} ${don.paiement.devise}, reçu ${operation.montant} ${operation.devise} (référence ${operation.referenceFournisseur}). Don non validé, à traiter à la main.`,
      );
      return this.appliquerEchec(
        idDon,
        don.id_paiement,
        CODE_MONTANT_INCOHERENT,
        `Attendu ${attendu} ${don.paiement.devise}, reçu ${operation.montant} ${operation.devise}.`,
      );
    }
    // Numéro du payeur, quand le fournisseur le renvoie (AangaraaPay) : il doit être celui du don.
    // Le webhook d'AangaraaPay n'est pas signé : ce contrôle évite d'associer au don le paiement
    // d'un autre client.
    if (
      operation.telephone &&
      don.paiement.numero_payeur &&
      operation.telephone.replace(/\D/g, '').slice(-9) !==
        don.paiement.numero_payeur.replace(/\D/g, '').slice(-9)
    ) {
      this.logger.error(
        `Don ${idDon} : paiement ${operation.referenceFournisseur} confirmé pour un autre numéro que celui du don. Don non validé, à traiter à la main.`,
      );
      return this.appliquerEchec(
        idDon,
        don.id_paiement,
        CODE_PAYEUR_INCOHERENT,
        'Numéro du payeur différent de celui du don.',
      );
    }
    if (options.succesTardif) {
      this.logger.warn(
        `Don ${idDon} : paiement confirmé par le fournisseur après son passage en ECHOUE (${don.paiement.code_erreur}). Don validé.`,
      );
    }
    const resultat = await this.appliquerValidation(
      idDon,
      options.succesTardif ? ['EN_ATTENTE', 'ECHOUE'] : ['EN_ATTENTE'],
    );
    return resultat.valide ? ('VALIDE' as const) : resultat.statut;
  }

  // Paiement en échec chez le fournisseur : le code et le message renvoyés sont enregistrés dans
  // le paiement du don, et loggés. Constat réel pour Notch Pay (docs/paiement/exemples/) : un
  // paiement « failed » ne donne aucune raison ; le donateur reçoit alors le message générique.
  private async enregistrerEchecFournisseur(
    idDon: number,
    idPaiement: number,
    operation: OperationFournisseur,
  ) {
    const code =
      operation.codeErreur ??
      codeErreurDepuisMessage(operation.messageErreur) ??
      CODES_PAR_STATUT[operation.statutFournisseur.toLowerCase()];
    const message =
      operation.messageErreur ??
      `Statut « ${operation.statutFournisseur} », aucune raison fournie.`;
    this.logger.warn(
      `Don ${idDon} : paiement ${operation.referenceFournisseur} en échec (statut ${operation.statutFournisseur}, code ${code ?? 'aucun'}) : ${message}`,
    );
    return this.appliquerEchec(idDon, idPaiement, code, message);
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
  // statutsDepart : EN_ATTENTE en temps normal ; ECHOUE aussi pour un paiement confirmé tard.
  private async appliquerValidation(
    idDon: number,
    statutsDepart: ('EN_ATTENTE' | 'ECHOUE')[] = ['EN_ATTENTE'],
  ) {
    const don = await this.prisma.don.findUnique({
      where: { id_don: idDon },
      include: { paiement: true, cagnotte: true },
    });
    if (!don) {
      throw new NotFoundException(m('dons.introuvable'));
    }

    const donValide = await this.prisma.$transaction(async (tx) => {
      // Passage conditionnel vers VALIDE : un seul appel concurrent peut obtenir count === 1.
      const { count } = await tx.don.updateMany({
        where: { id_don: idDon, statut: { in: statutsDepart } },
        data: { statut: 'VALIDE' },
      });
      if (count === 0) {
        return null;
      }

      await tx.paiement.update({
        where: { id_paiement: don.id_paiement },
        data: { statut: 'VALIDE', code_erreur: null, message_erreur: null },
      });

      await tx.cagnotte.update({
        where: { id_cagnotte: don.id_cagnotte },
        // Seul le don va à la cagnotte : les frais couvrent les coûts de Mobile Money.
        data: { montant_collecte: { increment: don.montant_don } },
      });

      await tx.transaction.create({
        data: {
          id_paiement: don.id_paiement,
          type: 'DON',
          // Somme réellement encaissée (don + frais).
          montant: don.montant_total,
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
        montant: Number(don.montant_don),
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
          montant_don: true,
          paiement: { select: { devise: true } },
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
        montant: don.montant_don,
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
