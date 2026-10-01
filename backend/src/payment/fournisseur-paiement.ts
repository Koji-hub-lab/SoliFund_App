import type { MethodePaiement } from './notchpay.utilitaires';

// Interface commune des fournisseurs de paiement Mobile Money (Notch Pay, AangaraaPay). Les dons,
// les retraits, les webhooks et la réconciliation ne dépendent que d'elle (via
// FournisseursPaiement), jamais d'un client particulier.

// Même valeurs que l'enum Prisma FournisseurPaiement.
export type NomFournisseur = 'NOTCHPAY' | 'AANGARAA';

// Statut SoliFund d'une opération (paiement ou versement) lue chez le fournisseur.
export type StatutOperation = 'EN_ATTENTE' | 'VALIDE' | 'ECHOUE';

export interface OperationFournisseur {
  // Référence de l'opération chez le fournisseur, pour la consulter ensuite.
  referenceFournisseur: string;
  statut: StatutOperation;
  // Statut tel que renvoyé par le fournisseur (« failed », « SUCCESSFUL »...).
  statutFournisseur: string;
  montant?: number;
  devise?: string;
  // Numéro du payeur ou du bénéficiaire, s'il est renvoyé (format libre).
  telephone?: string;
  // Raison d'un échec : code (si le fournisseur en donne un) et message de l'opérateur.
  codeErreur?: string;
  messageErreur?: string;
  // Réponse complète, telle que reçue.
  brut: unknown;
}

export interface PaiementDirect {
  montant: number;
  devise: string;
  // Notre référence unique (« SOLIFUND-DON-<id> »).
  reference: string;
  description: string;
  methode: MethodePaiement;
  // Numéro normalisé +2376XXXXXXXX ; chaque fournisseur l'envoie dans son format.
  numero: string;
  client: { nom: string; email?: string };
}

export interface ResultatPaiementDirect extends OperationFournisseur {
  // Vrai quand le fournisseur a accepté d'envoyer la demande sur le téléphone du client.
  demandeEnvoyee: boolean;
}

export interface VersementDirect {
  montant: number;
  // Notre référence (« SOLIFUND-RET-<id> ») ; tous les fournisseurs ne la transmettent pas.
  reference: string;
  description: string;
  methode: MethodePaiement;
  numero: string;
  nomBeneficiaire: string;
}

export interface SoldeFournisseur {
  // Solde disponible pour les versements.
  disponible: number;
  // Solde par opérateur, quand le fournisseur le détaille (AangaraaPay) : un versement Orange ne
  // peut alors utiliser que le solde Orange.
  parMethode?: Partial<Record<MethodePaiement, number>>;
  devise: string;
  brut: unknown;
}

// Erreurs : toutes les méthodes lèvent une ErreurPaiement (paiement.erreurs.ts). Pendant un
// paiement direct, l'erreur porte referenceFournisseur si l'opération existe déjà chez le
// fournisseur, et demandePeutEtrePartie si la demande a pu atteindre le téléphone du client.
// Une opération inconnue du fournisseur lève ErreurIntrouvablePaiement.
export interface FournisseurPaiement {
  readonly nom: NomFournisseur;
  // Nom affiché (« Notch Pay », « AangaraaPay »).
  readonly libelle: string;
  // Faux si le fournisseur ne permet pas d'annuler un paiement en cours (AangaraaPay).
  readonly peutAnnuler: boolean;
  // Faux si sa clé n'est pas configurée.
  estConfigure(): boolean;
  // Canal ou opérateur du fournisseur pour une méthode (« cm.mtn », « MTN_Cameroon »).
  canal(methode: MethodePaiement): string;
  initierPaiement(paiement: PaiementDirect): Promise<ResultatPaiementDirect>;
  consulterPaiement(
    referenceFournisseur: string,
  ): Promise<OperationFournisseur>;
  annulerPaiement(referenceFournisseur: string): Promise<void>;
  // Jamais de nouvel essai automatique : un versement ne doit pas partir deux fois.
  initierVersement(versement: VersementDirect): Promise<OperationFournisseur>;
  consulterVersement(
    referenceFournisseur: string,
    methode: MethodePaiement,
  ): Promise<OperationFournisseur>;
  lireSolde(): Promise<SoldeFournisseur>;
}
