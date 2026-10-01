import { Injectable } from '@nestjs/common';
import { NotchPayClient } from './notchpay.client';
import { ErreurPaiement } from './paiement.erreurs';
import type {
  FournisseurPaiement,
  OperationFournisseur,
  PaiementDirect,
  ResultatPaiementDirect,
  SoldeFournisseur,
  VersementDirect,
} from './fournisseur-paiement';
import type { PaiementNotchPay, VersementNotchPay } from './notchpay.reponses';
import {
  canalNotchPay,
  statutDepuisNotchPay,
  type MethodePaiement,
} from './notchpay.utilitaires';

function operation(
  lu: PaiementNotchPay | VersementNotchPay,
): OperationFournisseur {
  return {
    referenceFournisseur: lu.reference,
    statut: statutDepuisNotchPay(lu.statut),
    statutFournisseur: lu.statut,
    montant: lu.montant,
    devise: lu.devise,
    codeErreur: lu.codeErreur,
    messageErreur: lu.messageErreur,
    brut: lu.brut,
  };
}

// Notch Pay derrière l'interface FournisseurPaiement. Le paiement direct se fait en deux étapes :
// initialisation (POST /payments, rien n'est demandé au client), puis traitement (PUT, la demande
// part vers le téléphone). Si le traitement échoue, l'erreur porte la référence du paiement déjà
// initialisé, que l'appelant peut annuler.
@Injectable()
export class NotchPayFournisseur implements FournisseurPaiement {
  readonly nom = 'NOTCHPAY' as const;
  readonly libelle = 'Notch Pay';
  readonly peutAnnuler = true;

  constructor(private readonly client: NotchPayClient) {}

  estConfigure() {
    return this.client.estConfigure();
  }

  canal(methode: MethodePaiement) {
    return canalNotchPay(methode);
  }

  async initierPaiement(
    paiement: PaiementDirect,
  ): Promise<ResultatPaiementDirect> {
    let reference: string | undefined;
    try {
      const initialise = await this.client.initialiserPaiement({
        montant: paiement.montant,
        devise: paiement.devise,
        reference: paiement.reference,
        description: paiement.description,
        client: {
          nom: paiement.client.nom,
          email: paiement.client.email,
          telephone: paiement.numero,
        },
      });
      reference = initialise.reference;
      let traite = await this.client.traiterPaiement(
        reference,
        canalNotchPay(paiement.methode),
        paiement.numero,
      );
      // Échec immédiat sans raison : le paiement est reconsulté, au cas où la raison y figure.
      if (
        statutDepuisNotchPay(traite.statut) === 'ECHOUE' &&
        !traite.codeErreur &&
        !traite.messageErreur
      ) {
        traite = await this.client.consulterPaiement(reference).catch((e) => {
          if (e instanceof ErreurPaiement) return traite;
          throw e;
        });
      }
      return { ...operation(traite), demandeEnvoyee: true };
    } catch (e) {
      if (e instanceof ErreurPaiement) {
        e.referenceFournisseur ??= reference;
        // Échec à l'initialisation : rien n'a pu être envoyé au téléphone du client.
        e.demandePeutEtrePartie = reference !== undefined;
      }
      throw e;
    }
  }

  async consulterPaiement(reference: string) {
    return operation(await this.client.consulterPaiement(reference));
  }

  async annulerPaiement(reference: string) {
    await this.client.annulerPaiement(reference);
  }

  async initierVersement(versement: VersementDirect) {
    return operation(
      await this.client.initierVersement({
        montant: versement.montant,
        devise: 'XAF',
        reference: versement.reference,
        description: versement.description,
        canal: canalNotchPay(versement.methode),
        beneficiaire: {
          nom: versement.nomBeneficiaire,
          telephone: versement.numero,
        },
      }),
    );
  }

  // Notch Pay n'a pas besoin de l'opérateur pour retrouver un versement (paramètre de
  // l'interface, utilisé par AangaraaPay).
  async consulterVersement(reference: string) {
    return operation(await this.client.consulterVersement(reference));
  }

  async lireSolde(): Promise<SoldeFournisseur> {
    const solde = await this.client.lireSolde('XAF');
    return {
      disponible: solde.disponible,
      devise: solde.devise,
      brut: solde.brut,
    };
  }
}
