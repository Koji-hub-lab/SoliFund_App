import type {
  NouveauPaiement,
  NouveauVersement,
} from '../src/payment/notchpay.client';
import {
  ErreurIntrouvableNotchPay,
  ErreurNotchPay,
} from '../src/payment/notchpay.erreurs';
import type {
  PaiementNotchPay,
  SoldeNotchPay,
  VersementNotchPay,
} from '../src/payment/notchpay.reponses';

// Faux client Notch Pay des tests e2e : aucun appel réseau. Il se comporte comme le mode test de
// Notch Pay, où le dernier chiffre du numéro décide du résultat du paiement :
//   0 succès, 1 fonds insuffisants, 2 échec, 3 délai dépassé (reste en cours), 4 annulation.
// À rapprocher des réponses réelles (docs/paiement/exemples/) quand elles seront disponibles : les
// objets renvoyés ici sont ceux que produit notchpay.reponses.ts, pas les réponses brutes.
interface PaiementSimule {
  reference: string;
  nouveau: NouveauPaiement;
  numero?: string;
  canal?: string;
  annule: boolean;
}

export class FauxNotchPay {
  paiements: PaiementSimule[] = [];
  annulations: string[] = [];
  consultations = 0;
  // Erreur levée par le prochain appel à la méthode indiquée (une seule fois).
  erreurs: Partial<
    Record<'initialiser' | 'traiter' | 'consulter' | 'annuler', ErreurNotchPay>
  > = {};
  // Remplace le montant ou la devise renvoyés à la consultation (paiement incohérent).
  montantRenvoye?: number;
  deviseRenvoyee?: string;
  private compteur = 0;

  reinitialiser() {
    this.paiements = [];
    this.annulations = [];
    this.consultations = 0;
    this.erreurs = {};
    this.montantRenvoye = undefined;
    this.deviseRenvoyee = undefined;
  }

  private leverSiPrevu(methode: keyof FauxNotchPay['erreurs']) {
    const erreur = this.erreurs[methode];
    if (erreur) {
      delete this.erreurs[methode];
      throw erreur;
    }
  }

  private trouver(reference: string): PaiementSimule {
    const paiement = this.paiements.find(
      (p) => p.reference === reference || p.nouveau.reference === reference,
    );
    if (!paiement) {
      throw new ErreurIntrouvableNotchPay('Payment not found', {
        statutHttp: 404,
        code: '404',
      });
    }
    return paiement;
  }

  private lire(
    paiement: PaiementSimule,
    statut: string,
    erreur: { code?: string; message?: string } = {},
  ): PaiementNotchPay {
    return {
      reference: paiement.reference,
      referenceMarchand: paiement.nouveau.reference,
      statut,
      montant: this.montantRenvoye ?? paiement.nouveau.montant,
      devise: this.deviseRenvoyee ?? paiement.nouveau.devise ?? 'XAF',
      canal: paiement.canal,
      codeErreur: erreur.code,
      messageErreur: erreur.message,
      brut: {},
    };
  }

  initialiserPaiement(nouveau: NouveauPaiement): Promise<PaiementNotchPay> {
    this.leverSiPrevu('initialiser');
    this.compteur += 1;
    const paiement = {
      reference: `trx.test${this.compteur}`,
      nouveau,
      annule: false,
    };
    this.paiements.push(paiement);
    return Promise.resolve(this.lire(paiement, 'pending'));
  }

  traiterPaiement(
    reference: string,
    canal: string,
    numero: string,
  ): Promise<PaiementNotchPay> {
    this.leverSiPrevu('traiter');
    const paiement = this.trouver(reference);
    paiement.canal = canal;
    paiement.numero = numero;
    return Promise.resolve(this.lire(paiement, 'processing'));
  }

  consulterPaiement(reference: string): Promise<PaiementNotchPay> {
    this.consultations += 1;
    this.leverSiPrevu('consulter');
    const paiement = this.trouver(reference);
    if (paiement.annule) {
      return Promise.resolve(this.lire(paiement, 'canceled'));
    }
    switch (paiement.numero?.slice(-1)) {
      case '0':
        return Promise.resolve(this.lire(paiement, 'complete'));
      case '1':
        return Promise.resolve(
          this.lire(paiement, 'failed', {
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient funds',
          }),
        );
      case '2':
        return Promise.resolve(
          this.lire(paiement, 'failed', { message: 'Payment failed' }),
        );
      case '4':
        return Promise.resolve(this.lire(paiement, 'canceled'));
      default:
        // 3 (délai dépassé) ou paiement non traité : toujours en cours.
        return Promise.resolve(
          this.lire(paiement, paiement.numero ? 'processing' : 'pending'),
        );
    }
  }

  annulerPaiement(reference: string): Promise<void> {
    this.leverSiPrevu('annuler');
    const paiement = this.trouver(reference);
    paiement.annule = true;
    this.annulations.push(reference);
    return Promise.resolve();
  }

  // Non utilisés par les dons.
  initierVersement(_: NouveauVersement): Promise<VersementNotchPay> {
    return Promise.reject(new Error('versement non simulé'));
  }
  consulterVersement(_: string): Promise<VersementNotchPay> {
    return Promise.reject(new Error('versement non simulé'));
  }
  lireSolde(): Promise<SoldeNotchPay> {
    return Promise.reject(new Error('solde non simulé'));
  }
}
