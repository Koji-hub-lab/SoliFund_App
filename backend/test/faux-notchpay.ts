import type {
  NouveauPaiement,
  NouveauVersement,
} from '../src/payment/notchpay.client';
import {
  ErreurIntrouvablePaiement,
  ErreurPaiement,
} from '../src/payment/paiement.erreurs';
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
  // Versements : le dernier chiffre du numéro décide du résultat (0 réussi, 2 échoué, autre : en
  // cours), sauf si statutVersements impose un statut à tous, ou statutsVersement à un versement
  // (par notre référence « SOLIFUND-RET-... »).
  versements: { reference: string; nouveau: NouveauVersement }[] = [];
  statutVersements?: string;
  statutsVersement: Record<string, string> = {};
  solde = 1_000_000;
  soldesLus = 0;
  // Erreur levée par le prochain appel à la méthode indiquée (une seule fois).
  erreurs: Partial<
    Record<
      'initialiser' | 'traiter' | 'consulter' | 'annuler' | 'verser' | 'solde',
      ErreurPaiement
    >
  > = {};
  // Remplace le montant ou la devise renvoyés à la consultation (paiement incohérent).
  montantRenvoye?: number;
  deviseRenvoyee?: string;
  // Comme les réponses réelles (docs/paiement/exemples/) : un paiement « failed » sans raison.
  messageEchecAbsent = false;
  private compteur = 0;

  estConfigure() {
    return true;
  }

  reinitialiser() {
    this.paiements = [];
    this.annulations = [];
    this.versements = [];
    this.statutVersements = undefined;
    this.statutsVersement = {};
    this.solde = 1_000_000;
    this.soldesLus = 0;
    this.consultations = 0;
    this.erreurs = {};
    this.montantRenvoye = undefined;
    this.deviseRenvoyee = undefined;
    this.messageEchecAbsent = false;
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
      throw new ErreurIntrouvablePaiement('Payment not found', {
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
      codeErreur: this.messageEchecAbsent ? undefined : erreur.code,
      messageErreur: this.messageEchecAbsent ? undefined : erreur.message,
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

  private lireVersement(versement: {
    reference: string;
    nouveau: NouveauVersement;
  }): VersementNotchPay {
    const chiffre = versement.nouveau.beneficiaire.telephone.slice(-1);
    const statut =
      this.statutsVersement[versement.nouveau.reference] ??
      this.statutVersements ??
      (chiffre === '0'
        ? 'complete'
        : chiffre === '2'
          ? 'failed'
          : 'processing');
    return {
      reference: versement.reference,
      referenceMarchand: versement.nouveau.reference,
      statut,
      montant: versement.nouveau.montant,
      devise: versement.nouveau.devise ?? 'XAF',
      canal: versement.nouveau.canal,
      codeErreur: statut === 'failed' ? 'PROVIDER_ERROR' : undefined,
      messageErreur: statut === 'failed' ? 'Transfer failed' : undefined,
      brut: {},
    };
  }

  // Comme Notch Pay : le versement est d'abord « envoyé », son résultat vient à la consultation.
  initierVersement(nouveau: NouveauVersement): Promise<VersementNotchPay> {
    this.leverSiPrevu('verser');
    this.compteur += 1;
    const versement = { reference: `po.test${this.compteur}`, nouveau };
    this.versements.push(versement);
    return Promise.resolve({
      ...this.lireVersement(versement),
      statut: 'sent',
    });
  }

  consulterVersement(reference: string): Promise<VersementNotchPay> {
    this.consultations += 1;
    this.leverSiPrevu('consulter');
    const versement = this.versements.find(
      (v) => v.reference === reference || v.nouveau.reference === reference,
    );
    if (!versement) {
      return Promise.reject(
        new ErreurIntrouvablePaiement('Transfer not found', {
          statutHttp: 404,
          code: '404',
        }),
      );
    }
    return Promise.resolve(this.lireVersement(versement));
  }

  lireSolde(): Promise<SoldeNotchPay> {
    this.soldesLus += 1;
    this.leverSiPrevu('solde');
    return Promise.resolve({
      disponible: this.solde,
      devise: 'XAF',
      environnement: 'test',
      brut: {},
    });
  }
}
