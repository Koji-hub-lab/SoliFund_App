import { CheckCircle2, XCircle, Clock } from 'lucide-react';

// Badges de statut partagés (voir DESIGN.md) : libellé, classes et icône éventuelle.
// Forme commune : rounded-full px-3 py-1 text-xs font-bold + classes.

export const statutsRetrait = {
  EN_ATTENTE: { libelle: 'En attente', classes: 'bg-accent-soft text-[#7A5312]', Icone: Clock },
  APPROUVE: { libelle: 'Approuvé', classes: 'bg-primary-soft text-primary', Icone: null },
  TRAITE: { libelle: 'Traité', classes: 'bg-primary-soft text-primary', Icone: CheckCircle2 },
  REJETE: { libelle: 'Rejeté', classes: 'bg-destructive/10 text-destructive', Icone: XCircle },
};

export const statutsCagnotte = {
  ACTIVE: { libelle: 'Active', classes: 'bg-primary-soft text-primary' },
  TERMINEE: { libelle: 'Terminée', classes: 'bg-border text-muted-foreground' },
  SUSPENDUE: { libelle: 'Suspendue', classes: 'bg-destructive/10 text-destructive' },
  ANNULEE: { libelle: 'Annulée', classes: 'bg-destructive/10 text-destructive' },
};

export const statutsUtilisateur = {
  ACTIF: { libelle: 'Actif', classes: 'bg-primary-soft text-primary' },
  SUSPENDU: { libelle: 'Suspendu', classes: 'bg-accent-soft text-[#7A5312]' },
  BANNI: { libelle: 'Banni', classes: 'bg-destructive/10 text-destructive' },
  INACTIF: { libelle: 'Inactif', classes: 'bg-border text-muted-foreground' },
};

// Badge prêt à afficher pour un statut (inconnu : libellé brut en gris).
export function BadgeStatut({ statuts, statut }) {
  const s = statuts[statut] ?? { libelle: statut, classes: 'bg-border text-muted-foreground' };
  const Icone = s.Icone;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${s.classes}`}>
      {Icone && <Icone className="size-3" />}
      {s.libelle}
    </span>
  );
}
