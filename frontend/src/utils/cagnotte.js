// Calculs communs à l'affichage d'une cagnotte.

export function nbJoursRestants(dateFin) {
  return Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24));
}

export function pourcentageAtteint(cagnotte) {
  return Math.min(100, Math.round((Number(cagnotte.montant_collecte) / Number(cagnotte.objectif)) * 100));
}

// Badge d'état (DESIGN.md) : objectif atteint, puis terminée, puis urgence (7 jours ou moins).
export function badgeEtatCagnotte(pourcentage, jours) {
  if (pourcentage >= 100) return { texte: 'Objectif atteint', classes: 'bg-primary text-primary-foreground' };
  if (jours < 0) return { texte: 'Terminée', classes: 'bg-border text-muted-foreground' };
  if (jours <= 7) {
    return { texte: jours <= 1 ? 'Dernier jour' : `Plus que ${jours} jours`, classes: 'bg-accent-soft text-[#7A5312]' };
  }
  return null;
}

// Badge de statut vu par l'organisateur (tableau de bord, gestion d'une cagnotte).
export function badgeStatutCagnotte(cagnotte) {
  if (cagnotte.statut === 'SUSPENDUE') return { texte: 'Suspendue', classes: 'bg-destructive/10 text-destructive' };
  if (cagnotte.statut === 'ANNULEE') return { texte: 'Annulée', classes: 'bg-destructive/10 text-destructive' };
  const jours = nbJoursRestants(cagnotte.date_fin);
  if (cagnotte.statut === 'TERMINEE' || jours < 0) return { texte: 'Terminée', classes: 'bg-border text-muted-foreground' };
  if (jours <= 7) {
    return { texte: jours <= 1 ? 'Dernier jour' : `Plus que ${jours} jours`, classes: 'bg-accent-soft text-[#7A5312]' };
  }
  return { texte: 'Active', classes: 'bg-primary-soft text-primary' };
}
