import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  avertissementsCles,
  lireConfigurationNotchPay,
  type ConfigurationNotchPay,
} from './notchpay.config';
import { ErreurNotchPay, ErreurReseauNotchPay } from './notchpay.erreurs';
import {
  lireErreur,
  lirePaiement,
  lireSolde,
  lireVersement,
  type PaiementNotchPay,
  type SoldeNotchPay,
  type VersementNotchPay,
} from './notchpay.reponses';

export const DELAI_MAX_MS = 60_000;

export interface NouveauPaiement {
  montant: number;
  devise?: string;
  // Notre référence (genererReference) : unique, elle rend la création idempotente.
  reference: string;
  description: string;
  // Client : un email ou un téléphone au moins est exigé par Notch Pay.
  client: { nom?: string; email?: string; telephone?: string };
}

export interface NouveauVersement {
  montant: number;
  devise?: string;
  reference: string;
  description: string;
  // Canal du bénéficiaire (« cm.mtn », « cm.orange »).
  canal: string;
  // Bénéficiaire : identifiant Notch Pay ou numéro au format +2376XXXXXXXX.
  beneficiaire: string;
}

// Un échange HTTP avec Notch Pay, sans aucun en-tête (donc sans clé) : pour le script de
// découverte et le diagnostic.
export interface EchangeNotchPay {
  methode: string;
  chemin: string;
  corpsEnvoye?: unknown;
  statutHttp?: number;
  corpsRecu?: unknown;
  erreurReseau?: string;
  essai: number;
}

interface OptionsRequete {
  corps?: unknown;
  parametres?: Record<string, string>;
  // Ajoute l'en-tête X-Grant (clé privée) : versements et solde uniquement.
  avecClePrivee?: boolean;
}

// Client de l'API Notch Pay (https://developer.notchpay.co, docs/paiement/notchpay-openapi.yaml).
// - Authorization : clé publique, sur toutes les requêtes ; X-Grant : clé privée, uniquement pour
//   les versements et le solde.
// - Délai de 60 secondes par requête. Nouvel essai, avec un délai croissant, sur les erreurs
//   réseau et les réponses 5xx ; jamais sur les 4xx. Un nouvel essai ne peut pas créer de doublon :
//   chaque création porte notre référence unique, et un paiement déjà traité est refusé (4xx).
// - Les clés ne sont jamais écrites dans les logs ni dans les erreurs.
@Injectable()
export class NotchPayClient implements OnModuleInit {
  private readonly logger = new Logger('NotchPay');
  private readonly configuration: ConfigurationNotchPay;
  private readonly http: AxiosInstance;
  private readonly environnement?: string;
  private readonly hashWebhook?: string;

  // Attente avant chaque nouvel essai : 2 nouveaux essais, donc 3 tentatives au plus.
  delaisNouvelEssaiMs = [1_000, 3_000];
  // Appelée après chaque échange HTTP (script de découverte).
  surEchange?: (echange: EchangeNotchPay) => void;

  constructor(config: ConfigService) {
    this.configuration = lireConfigurationNotchPay(config);
    this.environnement = config.get<string>('NODE_ENV');
    this.hashWebhook = config.get<string>('NOTCHPAY_WEBHOOK_HASH');
    this.http = axios.create({
      baseURL: this.configuration.urlApi,
      timeout: DELAI_MAX_MS,
      // Les statuts d'erreur sont traités ici, pas par axios.
      validateStatus: () => true,
    });
  }

  onModuleInit() {
    const avertissements = avertissementsCles(
      [
        { nom: 'NOTCHPAY_PUBLIC_KEY', valeur: this.configuration.clePublique },
        { nom: 'NOTCHPAY_PRIVATE_KEY', valeur: this.configuration.clePrivee },
        { nom: 'NOTCHPAY_WEBHOOK_HASH', valeur: this.hashWebhook },
      ],
      this.environnement,
    );
    for (const avertissement of avertissements) this.logger.warn(avertissement);
  }

  // POST /payments : crée le paiement chez Notch Pay (rien n'est encore demandé au client).
  async initialiserPaiement(
    paiement: NouveauPaiement,
  ): Promise<PaiementNotchPay> {
    return lirePaiement(
      await this.requete('POST', '/payments', {
        corps: {
          amount: paiement.montant,
          currency: paiement.devise ?? 'XAF',
          reference: paiement.reference,
          description: paiement.description,
          customer: {
            name: paiement.client.nom,
            email: paiement.client.email,
            phone: paiement.client.telephone,
          },
        },
      }),
    );
  }

  // PUT /payments/{reference} : envoie la demande de paiement Mobile Money sur le téléphone.
  async traiterPaiement(
    reference: string,
    canal: string,
    numero: string,
  ): Promise<PaiementNotchPay> {
    return lirePaiement(
      await this.requete('PUT', this.cheminPaiement(reference), {
        corps: { channel: canal, data: { phone: numero } },
      }),
    );
  }

  // GET /payments/{reference}
  async consulterPaiement(reference: string): Promise<PaiementNotchPay> {
    return lirePaiement(
      await this.requete('GET', this.cheminPaiement(reference)),
    );
  }

  // DELETE /payments/{reference} : la réponse ne contient pas le paiement.
  async annulerPaiement(reference: string): Promise<void> {
    await this.requete('DELETE', this.cheminPaiement(reference));
  }

  // POST /transfers (clé privée)
  async initierVersement(
    versement: NouveauVersement,
  ): Promise<VersementNotchPay> {
    return lireVersement(
      await this.requete('POST', '/transfers', {
        avecClePrivee: true,
        corps: {
          amount: versement.montant,
          currency: versement.devise ?? 'XAF',
          reference: versement.reference,
          description: versement.description,
          channel: versement.canal,
          recipient: versement.beneficiaire,
        },
      }),
    );
  }

  // GET /transfers/{reference} (clé privée)
  async consulterVersement(reference: string): Promise<VersementNotchPay> {
    return lireVersement(
      await this.requete('GET', `/transfers/${encodeURIComponent(reference)}`, {
        avecClePrivee: true,
      }),
    );
  }

  // GET /balance (clé privée)
  async lireSolde(devise = 'XAF'): Promise<SoldeNotchPay> {
    return lireSolde(
      await this.requete('GET', '/balance', {
        avecClePrivee: true,
        parametres: { currency: devise },
      }),
    );
  }

  private cheminPaiement(reference: string) {
    return `/payments/${encodeURIComponent(reference)}`;
  }

  // Envoie la requête et renvoie le corps de la réponse (2xx), ou lève une ErreurNotchPay.
  private async requete(
    methode: 'GET' | 'POST' | 'PUT' | 'DELETE',
    chemin: string,
    options: OptionsRequete = {},
  ): Promise<unknown> {
    const tentatives = this.delaisNouvelEssaiMs.length + 1;
    let derniere: ErreurNotchPay | undefined;

    for (let essai = 1; essai <= tentatives; essai += 1) {
      if (essai > 1) await attendre(this.delaisNouvelEssaiMs[essai - 2]);
      const echange: EchangeNotchPay = {
        methode,
        chemin,
        corpsEnvoye: options.corps,
        essai,
      };
      try {
        const reponse = await this.http.request<unknown>({
          method: methode,
          url: chemin,
          data: options.corps,
          params: options.parametres,
          headers: {
            Authorization: this.configuration.clePublique,
            Accept: 'application/json',
            ...(options.avecClePrivee
              ? { 'X-Grant': this.configuration.clePrivee }
              : {}),
          },
        });
        echange.statutHttp = reponse.status;
        echange.corpsRecu = reponse.data;
        this.surEchange?.(echange);

        if (reponse.status >= 200 && reponse.status < 300) return reponse.data;
        derniere = lireErreur(reponse.status, reponse.data);
        // 4xx : la requête est refusée, un nouvel essai donnerait le même résultat.
        if (reponse.status < 500) break;
      } catch (e) {
        // Aucune réponse : délai dépassé, connexion refusée ou coupée.
        const detail =
          e instanceof AxiosError ? (e.code ?? e.message) : 'erreur inconnue';
        echange.erreurReseau = detail;
        this.surEchange?.(echange);
        derniere = new ErreurReseauNotchPay(
          `Notch Pay est injoignable (${detail}).`,
        );
      }
      this.logger.warn(
        `${methode} ${chemin} : ${derniere.message} (essai ${essai}/${tentatives})`,
      );
    }
    throw derniere!;
  }
}

function attendre(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
