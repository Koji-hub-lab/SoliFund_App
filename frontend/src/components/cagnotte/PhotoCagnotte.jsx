import { urlFichier } from '../../api/axios';
import { SymboleNjangi } from '../Logo';
import { badgeEtatCagnotte, nbJoursRestants, pourcentageAtteint } from '../../utils/cagnotte';

export default function PhotoCagnotte({ cagnotte }) {
  const badge = badgeEtatCagnotte(pourcentageAtteint(cagnotte), nbJoursRestants(cagnotte.date_fin));

  return (
    <div className="relative h-[260px] overflow-hidden rounded-[36px] bg-primary-soft sm:h-[400px] lg:h-[520px]">
      {cagnotte.image ? (
        <img src={urlFichier(cagnotte.image)} alt={cagnotte.titre} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <SymboleNjangi taille={96} />
        </div>
      )}
      {cagnotte.categorie?.nom && (
        <span className="absolute left-5 top-5 rounded-full bg-card px-4 py-1.5 text-sm font-bold text-foreground">
          {cagnotte.categorie.nom}
        </span>
      )}
      {badge && (
        <span className={`absolute right-5 top-5 rounded-full px-4 py-1.5 text-sm font-bold ${badge.classes}`}>{badge.texte}</span>
      )}
    </div>
  );
}
