import i18n from '../i18n';

// Calculs communs à l'affichage d'une cagnotte. Les textes des badges suivent la langue active.
const t = (cle, options) => i18n.t(`commun:${cle}`, options);
const badgeUrgence = (jours) => (jours <= 1 ? t('badges.dernierJour') : t('badges.plusQueJours', { jours }));

export function nbJoursRestants(dateFin) {
  return Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24));
}

export function pourcentageAtteint(cagnotte) {
  return Math.min(100, Math.round((Number(cagnotte.montant_collecte) / Number(cagnotte.objectif)) * 100));
}

// Badge d'état (DESIGN.md) : objectif atteint, puis terminée, puis urgence (7 jours ou moins).
export function badgeEtatCagnotte(pourcentage, jours) {
  if (pourcentage >= 100) return { texte: t('badges.objectifAtteint'), classes: 'bg-primary text-primary-foreground' };
  if (jours < 0) return { texte: t('statuts.cagnotte.TERMINEE'), classes: 'bg-border text-muted-foreground' };
  if (jours <= 7) {
    return { texte: badgeUrgence(jours), classes: 'bg-accent-soft text-[#7A5312]' };
  }
  return null;
}

// Badge de statut vu par l'organisateur (tableau de bord, gestion d'une cagnotte).
export function badgeStatutCagnotte(cagnotte) {
  const statut = (s) => t(`statuts.cagnotte.${s}`);
  if (cagnotte.statut === 'SUSPENDUE') return { texte: statut('SUSPENDUE'), classes: 'bg-destructive/10 text-destructive' };
  if (cagnotte.statut === 'ANNULEE') return { texte: statut('ANNULEE'), classes: 'bg-destructive/10 text-destructive' };
  if (cagnotte.statut === 'EN_VERIFICATION') return { texte: statut('EN_VERIFICATION'), classes: 'bg-accent-soft text-[#7A5312]' };
  if (cagnotte.statut === 'REFUSEE') return { texte: statut('REFUSEE'), classes: 'bg-destructive/10 text-destructive' };
  const jours = nbJoursRestants(cagnotte.date_fin);
  if (cagnotte.statut === 'TERMINEE' || jours < 0) return { texte: statut('TERMINEE'), classes: 'bg-border text-muted-foreground' };
  if (jours <= 7) {
    return { texte: badgeUrgence(jours), classes: 'bg-accent-soft text-[#7A5312]' };
  }
  return { texte: statut('ACTIVE'), classes: 'bg-primary-soft text-primary' };
}
