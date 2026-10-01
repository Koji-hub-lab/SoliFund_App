import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  ErreurAuthentificationPaiement,
  ErreurConfigurationPaiement,
  ErreurIntrouvablePaiement,
  ErreurLimitePaiement,
  ErreurPaiement,
  ErreurReponsePaiement,
  ErreurReseauPaiement,
  ErreurServeurPaiement,
  ErreurValidationPaiement,
} from './paiement.erreurs';
import type { MethodePaiement } from './notchpay.utilitaires';

// Client de l'API AangaraaPay (résumé de la documentation : docs/paiement/aangaraa-api.md).
// - Pas d'en-tête d'authentification : la clé (app_key) est dans le corps, et dans l'adresse pour
//   le solde. Elle est masquée partout où un texte peut être écrit (logs, messages d'erreur,
//   échanges enregistrés), adresses comprises.
// - Délai de 60 secondes. Nouvel essai sur erreur réseau ou 5xx uniquement, et JAMAIS pour un
//   versement (l'API ne prend pas de référence marchande : un nouvel essai pourrait verser deux fois).

export const URL_API_AANGARAA_PAR_DEFAUT =
  'https://api-production.aangaraa-pay.com';
export const DELAI_MAX_AANGARAA_MS = 60_000;
const MASQUE = '[clé masquée]';

// Opérateur AangaraaPay de chaque méthode de paiement SoliFund.
export const OPERATEURS_AANGARAA: Record<MethodePaiement, string> = {
  MTN_MOBILE_MONEY: 'MTN_Cameroon',
  ORANGE_MONEY: 'Orange_Cameroon',
};

// Opération (paiement ou versement) telle que lue dans une réponse AangaraaPay.
export interface OperationAangaraa {
  // payToken (paiement) ou reference_id (versement).
  reference: string;
  // SUCCESSFUL, PENDING, FAILED, CANCELLED, EXPIRED.
  statut: string;
  montant?: number;
  devise?: string;
  telephone?: string;
  // details.reason : raison donnée par l'opérateur (« Solde insuffisant »...).
  raison?: string;
  message?: string;
  brut: unknown;
}

export interface SoldeAangaraa {
  // balance_in_db : solde du service.
  solde: number;
  // balance_details : montant par opérateur.
  parOperateur: Partial<Record<MethodePaiement, number>>;
  devise: string;
  brut: unknown;
}

// Un échange HTTP avec AangaraaPay, clé masquée (diagnostic, tests).
export interface EchangeAangaraa {
  methode: string;
  chemin: string;
  corpsEnvoye?: unknown;
  statutHttp?: number;
  corpsRecu?: unknown;
  erreurReseau?: string;
  essai: number;
}

type Objet = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Objet {
  return (
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
  );
}

function texte(valeur: unknown): string | undefined {
  if (typeof valeur === 'string' && valeur !== '') return valeur;
  if (typeof valeur === 'number') return String(valeur);
  return undefined;
}

// Les montants arrivent en nombre ou en chaîne (« 1000 », « 500.00 »).
function nombre(valeur: unknown): number | undefined {
  const n = typeof valeur === 'string' ? Number(valeur) : valeur;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

// Numéro normalisé +2376XXXXXXXX → 2376XXXXXXXX (paiement, versement) ou 6XXXXXXXX (abonné).
function avecIndicatif(numero: string) {
  return numero.replace(/^\+/, '');
}
function sansIndicatif(numero: string) {
  return numero.replace(/^\+?237/, '');
}

@Injectable()
export class AangaraaPayClient {
  private readonly logger = new Logger('AangaraaPay');
  private readonly http: AxiosInstance;
  private readonly cle: string;
  // Jeton secret du webhook (AANGARAA_WEBHOOK_JETON), placé dans notify_url : AangaraaPay ne
  // signe pas ses notifications, seul ce jeton prouve qu'elles viennent de l'adresse donnée.
  private readonly jetonWebhook: string;
  // notify_url : webhook de SoliFund, construit avec PUBLIC_API_URL et le jeton.
  // notify_url du webhook ; null sans PUBLIC_API_URL (obligatoire au démarrage avec AangaraaPay).
  readonly urlNotification: string | null;

  // Attente avant chaque nouvel essai : 2 nouveaux essais, donc 3 tentatives au plus.
  delaisNouvelEssaiMs = [1_000, 3_000];
  // Appelée après chaque échange HTTP, clé masquée.
  surEchange?: (echange: EchangeAangaraa) => void;

  constructor(config: ConfigService) {
    this.cle = config.get<string>('AANGARAA_APP_KEY') ?? '';
    this.jetonWebhook = config.get<string>('AANGARAA_WEBHOOK_JETON') ?? '';
    const urlApi = (
      config.get<string>('AANGARAA_API_URL') || URL_API_AANGARAA_PAR_DEFAUT
    ).replace(/\/+$/, '');
    const urlPublique = config
      .get<string>('PUBLIC_API_URL')
      ?.replace(/\/+$/, '');
    this.urlNotification = urlPublique
      ? `${urlPublique}/paiements/webhook/aangaraa/${encodeURIComponent(this.jetonWebhook)}`
      : null;
    this.http = axios.create({
      baseURL: urlApi,
      timeout: DELAI_MAX_AANGARAA_MS,
      // Les statuts d'erreur sont traités ici, pas par axios.
      validateStatus: () => true,
    });
  }

  estConfigure() {
    return this.cle !== '';
  }

  // POST /api/v1/no_redirect/payment : la demande part vers le téléphone du client.
  async payerDirect(paiement: {
    numero: string;
    montant: number;
    description: string;
    reference: string;
    methode: MethodePaiement;
  }): Promise<OperationAangaraa> {
    if (!this.urlNotification) {
      // Rien n'est envoyé : AangaraaPay ne pourrait pas prévenir SoliFund du résultat.
      throw new ErreurConfigurationPaiement(
        'PUBLIC_API_URL manquante : adresse du webhook AangaraaPay inconnue.',
      );
    }
    const brut = await this.requete('POST', '/api/v1/no_redirect/payment', {
      corps: {
        phone_number: avecIndicatif(paiement.numero),
        amount: String(paiement.montant),
        description: paiement.description,
        app_key: this.cle,
        transaction_id: paiement.reference,
        notify_url: this.urlNotification,
        operator: OPERATEURS_AANGARAA[paiement.methode],
        devise_id: 'XAF',
      },
    });
    const donnees = estObjet(brut) && estObjet(brut.data) ? brut.data : {};
    const reference = texte(donnees.payToken) ?? texte(donnees.pay_token);
    if (!reference) {
      // Réponse sans payToken : la demande n'a pas été prise en charge. Refus définitif, avec la
      // raison renvoyée (le don passe en ECHOUE).
      const corps = estObjet(brut) ? brut : {};
      const raison =
        texte(donnees.reason) ??
        texte(donnees.description) ??
        texte(corps.message) ??
        'Réponse AangaraaPay sans payToken.';
      throw new ErreurValidationPaiement(this.masquer(raison), {
        code: texte(donnees.status) ?? texte(donnees.code),
        brut: this.masquer(brut),
      });
    }
    return {
      reference,
      statut: texte(donnees.status) ?? 'PENDING',
      message: estObjet(brut) ? texte(brut.message) : undefined,
      brut: this.masquer(brut),
    };
  }

  // POST /api/v1/aangaraa_check_status
  async consulterPaiement(payToken: string): Promise<OperationAangaraa> {
    const brut = await this.requete('POST', '/api/v1/aangaraa_check_status', {
      corps: { payToken, app_key: this.cle },
    });
    return this.lireOperation(brut, payToken, 'paiement');
  }

  // POST /api/v1/aangaraa-pay/withdrawal. Une seule tentative, quoi qu'il arrive.
  async verser(versement: {
    numero: string;
    montant: number;
    methode: MethodePaiement;
    nom?: string;
  }): Promise<OperationAangaraa> {
    const brut = await this.requete('POST', '/api/v1/aangaraa-pay/withdrawal', {
      sansNouvelEssai: true,
      corps: {
        app_key: this.cle,
        phone_number: avecIndicatif(versement.numero),
        amount: String(versement.montant),
        payment_method: OPERATEURS_AANGARAA[versement.methode],
        username: versement.nom,
      },
    });
    const donnees = estObjet(brut) && estObjet(brut.data) ? brut.data : {};
    const reference = texte(donnees.reference_id);
    if (!reference) {
      throw new ErreurReponsePaiement(
        'Réponse AangaraaPay illisible : reference_id absent.',
        { brut: this.masquer(brut) },
      );
    }
    return {
      reference,
      statut: texte(donnees.status) ?? 'PENDING',
      montant: nombre(donnees.amount),
      devise: 'XAF',
      telephone: texte(donnees.phone_number),
      message: texte(donnees.message),
      brut: this.masquer(brut),
    };
  }

  // GET /api/v1/check_withdrawal_status/{reference_id}?payment_method=…
  async consulterVersement(
    referenceId: string,
    methode: MethodePaiement,
  ): Promise<OperationAangaraa> {
    const brut = await this.requete(
      'GET',
      `/api/v1/check_withdrawal_status/${encodeURIComponent(referenceId)}`,
      { parametres: { payment_method: OPERATEURS_AANGARAA[methode] } },
    );
    return this.lireOperation(brut, referenceId, 'versement');
  }

  // GET /api/v1/service/balance/{app_key} : la clé est dans l'adresse (masquée dans les logs).
  async lireSolde(): Promise<SoldeAangaraa> {
    const brut = await this.requete(
      'GET',
      `/api/v1/service/balance/${encodeURIComponent(this.cle)}`,
    );
    const donnees = estObjet(brut) && estObjet(brut.data) ? brut.data : {};
    const solde = nombre(donnees.balance_in_db);
    if (solde === undefined) {
      throw new ErreurReponsePaiement(
        'Réponse AangaraaPay illisible : balance_in_db absent.',
        { brut: this.masquer(brut) },
      );
    }
    const details = estObjet(donnees.balance_details)
      ? donnees.balance_details
      : {};
    const montant = (cle: string) => {
      const detail = details[cle];
      return estObjet(detail) ? nombre(detail.amount) : undefined;
    };
    const parOperateur: Partial<Record<MethodePaiement, number>> = {};
    const mtn = montant('mtn_cameroon');
    const orange = montant('orange_cameroon');
    if (mtn !== undefined) parOperateur.MTN_MOBILE_MONEY = mtn;
    if (orange !== undefined) parOperateur.ORANGE_MONEY = orange;
    return { solde, parOperateur, devise: 'XAF', brut: this.masquer(brut) };
  }

  // POST /api/v1/get_user_info : nom complet de l'abonné chez l'opérateur.
  async infosAbonne(
    numero: string,
    methode: MethodePaiement,
  ): Promise<{ nomComplet: string; brut: unknown }> {
    const brut = await this.requete('POST', '/api/v1/get_user_info', {
      corps: {
        msisdn: sansIndicatif(numero),
        api_key: this.cle,
        country: 'Cameroon',
        operator: OPERATEURS_AANGARAA[methode],
      },
    });
    const donnees = estObjet(brut) && estObjet(brut.data) ? brut.data : {};
    const nomComplet = texte(donnees.full_name);
    if (!nomComplet) {
      throw new ErreurReponsePaiement(
        'Réponse AangaraaPay illisible : full_name absent.',
        { brut: this.masquer(brut) },
      );
    }
    return { nomComplet, brut: this.masquer(brut) };
  }

  // Statut d'un paiement ou d'un versement (même forme de réponse).
  private lireOperation(
    brut: unknown,
    reference: string,
    nom: 'paiement' | 'versement',
  ): OperationAangaraa {
    const corps = estObjet(brut) ? brut : {};
    const statut = texte(corps.status);
    if (!statut) {
      throw new ErreurReponsePaiement(
        `Réponse AangaraaPay illisible : statut du ${nom} absent.`,
        { brut: this.masquer(brut) },
      );
    }
    if (statut.toUpperCase() === 'NOT_FOUND') {
      throw new ErreurIntrouvablePaiement(
        texte(corps.message) ?? `${nom} introuvable chez AangaraaPay.`,
        { code: 'NOT_FOUND', brut: this.masquer(brut) },
      );
    }
    const details = estObjet(corps.details) ? corps.details : {};
    return {
      reference,
      statut,
      montant: nombre(corps.amount),
      devise: texte(corps.currency),
      telephone: texte(corps.phone_number),
      raison: texte(details.reason),
      message: texte(corps.message),
      brut: this.masquer(brut),
    };
  }

  // Remplace la clé et le jeton du webhook partout où ils apparaissent (texte, adresse, corps JSON).
  private masquer<T>(valeur: T): T {
    if (valeur === undefined) return valeur;
    if (typeof valeur === 'string') {
      let texteMasque: string = valeur;
      for (const secret of [this.cle, this.jetonWebhook].filter((s) => s)) {
        texteMasque = texteMasque
          .split(secret)
          .join(MASQUE)
          .split(encodeURIComponent(secret))
          .join(MASQUE);
      }
      return texteMasque as T;
    }
    if (!this.cle && !this.jetonWebhook) return valeur;
    return JSON.parse(this.masquer(JSON.stringify(valeur))) as T;
  }

  // Réponse d'erreur ({ statusCode, message, data: { description, code } }) → exception typée.
  private erreur(statutHttp: number, brut: unknown): ErreurPaiement {
    const corps = estObjet(brut) ? brut : {};
    const donnees = estObjet(corps.data) ? corps.data : {};
    const titre = texte(corps.message);
    const message = this.masquer(
      texte(donnees.description) ??
        titre ??
        `Erreur AangaraaPay (HTTP ${statutHttp}).`,
    );
    const code = texte(donnees.code) ?? titre ?? String(statutHttp);
    const details = { statutHttp, code, brut: this.masquer(brut) };
    // Clé inconnue (404 « Service not found ») ou service inactif (403) : problème de clé.
    if (
      statutHttp === 401 ||
      statutHttp === 403 ||
      (statutHttp === 404 && /service/i.test(titre ?? ''))
    ) {
      return new ErreurAuthentificationPaiement(message, details);
    }
    if (statutHttp === 404)
      return new ErreurIntrouvablePaiement(message, details);
    if (statutHttp === 429) return new ErreurLimitePaiement(message, details);
    if (statutHttp >= 500) return new ErreurServeurPaiement(message, details);
    return new ErreurValidationPaiement(message, details);
  }

  private async requete(
    methode: 'GET' | 'POST',
    chemin: string,
    options: {
      corps?: unknown;
      parametres?: Record<string, string>;
      sansNouvelEssai?: boolean;
    } = {},
  ): Promise<unknown> {
    const tentatives = options.sansNouvelEssai
      ? 1
      : this.delaisNouvelEssaiMs.length + 1;
    // Adresse et corps tels qu'ils peuvent apparaître dans un log : clé masquée.
    const cheminAffiche = this.masquer(chemin);
    let derniere: ErreurPaiement | undefined;

    for (let essai = 1; essai <= tentatives; essai += 1) {
      if (essai > 1) await attendre(this.delaisNouvelEssaiMs[essai - 2]);
      const echange: EchangeAangaraa = {
        methode,
        chemin: cheminAffiche,
        corpsEnvoye: this.masquer(options.corps),
        essai,
      };
      try {
        const reponse = await this.http.request<unknown>({
          method: methode,
          url: chemin,
          data: options.corps,
          params: options.parametres,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
        echange.statutHttp = reponse.status;
        echange.corpsRecu = this.masquer(reponse.data);
        this.surEchange?.(echange);

        if (reponse.status >= 200 && reponse.status < 300) return reponse.data;
        derniere = this.erreur(reponse.status, reponse.data);
        // 4xx : la requête est refusée, un nouvel essai donnerait le même résultat.
        if (reponse.status < 500) break;
      } catch (e) {
        // Aucune réponse : délai dépassé, connexion refusée ou coupée. Seul le code de l'erreur
        // est gardé (le message d'axios peut contenir l'adresse, donc la clé).
        const detail =
          e instanceof AxiosError
            ? (e.code ?? 'ERREUR_RESEAU')
            : 'erreur inconnue';
        echange.erreurReseau = detail;
        this.surEchange?.(echange);
        derniere = new ErreurReseauPaiement(
          `AangaraaPay est injoignable (${detail}).`,
        );
      }
      this.logger.warn(
        `${methode} ${cheminAffiche} : ${derniere.message} (essai ${essai}/${tentatives})`,
      );
    }
    throw derniere!;
  }
}

function attendre(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
