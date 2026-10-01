import { Injectable } from '@nestjs/common';
import {
  AangaraaPayClient,
  OPERATEURS_AANGARAA,
  type OperationAangaraa,
} from './aangaraa.client';
import {
  ErreurConfigurationPaiement,
  ErreurPaiement,
  estErreurTemporaire,
} from './paiement.erreurs';
import type {
  FournisseurPaiement,
  OperationFournisseur,
  PaiementDirect,
  ResultatPaiementDirect,
  SoldeFournisseur,
  VersementDirect,
} from './fournisseur-paiement';
import {
  codeErreurDepuisMessage,
  statutDepuisNotchPay,
  type MethodePaiement,
} from './notchpay.utilitaires';

// Statuts AangaraaPay : SUCCESSFUL, PENDING, FAILED, CANCELLED, EXPIRED. Même correspondance que
// pour Notch Pay (statutDepuisNotchPay ignore la casse) : SUCCESSFUL → VALIDE ; FAILED, CANCELLED,
// EXPIRED → ECHOUE ; le reste → EN_ATTENTE.
const CODES_PAR_STATUT: Record<string, string> = {
  CANCELLED: 'CANCELLED_BY_USER',
  EXPIRED: 'TIMEOUT',
};

function operation(lu: OperationAangaraa): OperationFournisseur {
  const statut = statutDepuisNotchPay(lu.statut);
  return {
    referenceFournisseur: lu.reference,
    statut,
    statutFournisseur: lu.statut,
    montant: lu.montant,
    devise: lu.devise,
    telephone: lu.telephone,
    codeErreur:
      statut === 'ECHOUE'
        ? (codeErreurDepuisMessage(lu.raison) ??
          CODES_PAR_STATUT[lu.statut.toUpperCase()])
        : undefined,
    // details.reason (raison de l'opérateur) ; à défaut, le message de la réponse.
    messageErreur: statut === 'ECHOUE' ? (lu.raison ?? lu.message) : lu.raison,
    brut: lu.brut,
  };
}

// AangaraaPay derrière l'interface FournisseurPaiement. Le paiement direct se fait en un seul
// appel, qui envoie la demande au téléphone. AangaraaPay ne permet pas d'annuler un paiement.
@Injectable()
export class AangaraaPayFournisseur implements FournisseurPaiement {
  readonly nom = 'AANGARAA' as const;
  readonly libelle = 'AangaraaPay';
  readonly peutAnnuler = false;

  constructor(private readonly client: AangaraaPayClient) {}

  estConfigure() {
    return this.client.estConfigure();
  }

  canal(methode: MethodePaiement) {
    return OPERATEURS_AANGARAA[methode];
  }

  async initierPaiement(
    paiement: PaiementDirect,
  ): Promise<ResultatPaiementDirect> {
    try {
      const resultat = operation(
        await this.client.payerDirect({
          numero: paiement.numero,
          montant: paiement.montant,
          description: paiement.description,
          reference: paiement.reference,
          methode: paiement.methode,
        }),
      );
      return { ...resultat, demandeEnvoyee: resultat.statut !== 'ECHOUE' };
    } catch (e) {
      // Sans réponse (réseau, 5xx), la demande a pu partir ; refusée (4xx), elle n'est pas partie.
      if (e instanceof ErreurPaiement) {
        e.demandePeutEtrePartie = estErreurTemporaire(e);
      }
      throw e;
    }
  }

  async consulterPaiement(payToken: string) {
    return operation(await this.client.consulterPaiement(payToken));
  }

  annulerPaiement(): Promise<void> {
    return Promise.reject(
      new ErreurConfigurationPaiement(
        "AangaraaPay ne permet pas d'annuler un paiement.",
      ),
    );
  }

  async initierVersement(versement: VersementDirect) {
    return operation(
      await this.client.verser({
        numero: versement.numero,
        montant: versement.montant,
        methode: versement.methode,
        nom: versement.nomBeneficiaire,
      }),
    );
  }

  async consulterVersement(referenceId: string, methode: MethodePaiement) {
    return operation(
      await this.client.consulterVersement(referenceId, methode),
    );
  }

  async lireSolde(): Promise<SoldeFournisseur> {
    const solde = await this.client.lireSolde();
    return {
      disponible: solde.solde,
      parMethode: solde.parOperateur,
      devise: solde.devise,
      brut: solde.brut,
    };
  }
}
