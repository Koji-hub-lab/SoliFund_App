import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import BarreProgression from '../BarreProgression';
import { urlFichier } from '../../api/axios';
import { formaterMontant } from '../../utils/format';
import { nbJoursRestants } from '../../utils/cagnotte';

// Carte publique d'une cagnotte (accueil, liste des cagnottes) : toute la carte est cliquable.
function texteJoursRestants(jours) {
  if (jours < 0) return 'Terminée';
  if (jours === 0) return 'Dernier jour';
  return `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`;
}

// Badge en haut à droite : objectif atteint en priorité, sinon urgence (7 jours ou moins).
function badgeEtat(pourcentage, jours) {
  if (pourcentage >= 100) return { texte: 'Objectif atteint', classes: 'bg-primary text-primary-foreground' };
  if (jours >= 0 && jours <= 7) {
    return { texte: jours <= 1 ? 'Dernier jour' : `Plus que ${jours} jours`, classes: 'bg-accent-soft text-[#7A5312]' };
  }
  return null;
}

export default function CarteCagnotte({ c }) {
  const pourcentage = Math.min(100, Math.round((c.montant_collecte / c.objectif) * 100));
  const jours = nbJoursRestants(c.date_fin);
  const badge = badgeEtat(pourcentage, jours);
  const nbDonateurs = c.nb_donateurs ?? 0;

  return (
    <Link
      to={`/cagnottes/${c.id_cagnotte}`}
      className="group flex flex-col overflow-hidden rounded-[28px] border border-border bg-card text-foreground "
    >
      <div className="relative h-[200px] overflow-hidden bg-primary-soft">
        {c.image && (
          <img
            src={urlFichier(c.image_miniature ?? c.image)}
            alt={c.titre}
            loading="lazy"
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
          />
        )}
        {c.categorie?.nom && (
          <span className="absolute left-4 top-4 rounded-full bg-card px-3 py-1 text-xs font-bold text-foreground">{c.categorie.nom}</span>
        )}
        {badge && (
          <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${badge.classes}`}>{badge.texte}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="m-0 font-display text-xl font-bold leading-snug text-foreground">{c.titre}</h3>
        <div className="mt-auto pt-5">
          <BarreProgression pourcentage={pourcentage} />
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="text-base font-bold text-foreground">{formaterMontant(c.montant_collecte, c.devise)}</span>
            <span className="text-sm text-muted-foreground">{texteJoursRestants(jours)}</span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4" />
            {nbDonateurs} donateur{nbDonateurs > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}
