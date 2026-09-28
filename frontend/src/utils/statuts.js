import { CheckCircle2, XCircle, Clock } from 'lucide-react';

// Statuts des retraits : libellé lisible, classes du badge et icône (partagés entre
// pages/admin/AdminRetraits.jsx et pages/DetailCagnotte.jsx).
export const statutsRetrait = {
  EN_ATTENTE: { libelle: 'En attente', classes: 'bg-accent/20 text-accent-foreground', Icone: Clock },
  APPROUVE: { libelle: 'Approuvé', classes: 'bg-primary/10 text-primary', Icone: null },
  TRAITE: { libelle: 'Traité', classes: 'bg-primary/10 text-primary', Icone: CheckCircle2 },
  REJETE: { libelle: 'Rejeté', classes: 'bg-destructive/10 text-destructive', Icone: XCircle },
};
