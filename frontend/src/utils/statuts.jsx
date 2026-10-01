import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

// Badges de statut partagés (voir DESIGN.md) : clé de traduction, classes et icône éventuelle.
// Forme commune : rounded-full px-3 py-1 text-xs font-bold + classes.

export const statutsRetrait = {
  EN_ATTENTE: { cle: 'commun:statuts.retrait.EN_ATTENTE', classes: 'bg-accent-soft text-[#7A5312]', Icone: Clock },
  APPROUVE: { cle: 'commun:statuts.retrait.APPROUVE', classes: 'bg-primary-soft text-primary', Icone: Clock },
  TRAITE: { cle: 'commun:statuts.retrait.TRAITE', classes: 'bg-primary-soft text-primary', Icone: CheckCircle2 },
  REJETE: { cle: 'commun:statuts.retrait.REJETE', classes: 'bg-destructive/10 text-destructive', Icone: XCircle },
  // Versement échoué : l'administrateur peut le relancer ou rejeter le retrait.
  ECHOUE: { cle: 'commun:statuts.retrait.ECHOUE', classes: 'bg-destructive/10 text-destructive', Icone: XCircle },
};

export const statutsCagnotte = {
  ACTIVE: { cle: 'commun:statuts.cagnotte.ACTIVE', classes: 'bg-primary-soft text-primary' },
  TERMINEE: { cle: 'commun:statuts.cagnotte.TERMINEE', classes: 'bg-border text-muted-foreground' },
  SUSPENDUE: { cle: 'commun:statuts.cagnotte.SUSPENDUE', classes: 'bg-destructive/10 text-destructive' },
  ANNULEE: { cle: 'commun:statuts.cagnotte.ANNULEE', classes: 'bg-destructive/10 text-destructive' },
  EN_VERIFICATION: { cle: 'commun:statuts.cagnotte.EN_VERIFICATION', classes: 'bg-accent-soft text-[#7A5312]', Icone: Clock },
  REFUSEE: { cle: 'commun:statuts.cagnotte.REFUSEE', classes: 'bg-destructive/10 text-destructive', Icone: XCircle },
};

export const statutsUtilisateur = {
  ACTIF: { cle: 'commun:statuts.utilisateur.ACTIF', classes: 'bg-primary-soft text-primary' },
  SUSPENDU: { cle: 'commun:statuts.utilisateur.SUSPENDU', classes: 'bg-accent-soft text-[#7A5312]' },
  BANNI: { cle: 'commun:statuts.utilisateur.BANNI', classes: 'bg-destructive/10 text-destructive' },
  INACTIF: { cle: 'commun:statuts.utilisateur.INACTIF', classes: 'bg-border text-muted-foreground' },
};

// État de la vérification d'identité d'un organisateur (pages d'administration).
export const statutsIdentite = {
  VALIDEE: { cle: 'identite:statuts.VALIDEE', classes: 'bg-primary-soft text-primary', Icone: CheckCircle2 },
  EN_ATTENTE: { cle: 'identite:statuts.EN_ATTENTE', classes: 'bg-accent-soft text-[#7A5312]', Icone: Clock },
  REFUSEE: { cle: 'identite:statuts.REFUSEE', classes: 'bg-destructive/10 text-destructive', Icone: XCircle },
  NON_SOUMISE: { cle: 'identite:statuts.NON_SOUMISE', classes: 'bg-border text-muted-foreground' },
};

// Raison pour laquelle une cagnotte attend une vérification (code renvoyé par l'API).
export function libelleRaisonVerification(code) {
  return i18n.t(`identite:raisons.${code}`, { defaultValue: code });
}

// Motifs de signalement d'une cagnotte (codes de l'API), et leur libellé dans la langue active.
export const MOTIFS_SIGNALEMENT = ['ARNAQUE', 'CONTENU_INAPPROPRIE', 'FAUSSES_INFORMATIONS', 'AUTRE'];

export function libelleMotifSignalement(code) {
  return i18n.t(`cagnotte:signalement.motifs.${code}`, { defaultValue: code });
}

// Badge prêt à afficher pour un statut (inconnu : code brut en gris).
export function BadgeStatut({ statuts, statut }) {
  const { t } = useTranslation();
  const s = statuts[statut];
  const Icone = s?.Icone;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${s?.classes ?? 'bg-border text-muted-foreground'}`}>
      {Icone && <Icone className="size-3" />}
      {s ? t(s.cle) : statut}
    </span>
  );
}
