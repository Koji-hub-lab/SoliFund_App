import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { SymboleNjangi } from '../Logo';
import { urlFichier } from '../../api/axios';
import { formaterMontant } from '../../utils/format';
import { badgeStatutCagnotte, nbJoursRestants } from '../../utils/cagnotte';

export default function EnTeteGestion({ cagnotte }) {
  const badge = badgeStatutCagnotte(cagnotte);
  const jours = nbJoursRestants(cagnotte.date_fin);
  const nb = cagnotte.nb_donateurs ?? 0;
  const texteJours = jours < 0 ? 'terminée' : `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`;

  return (
    <div>
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <Link to="/mes-cagnottes" className="inline-flex min-h-11 items-center font-bold text-primary hover:underline">Mes cagnottes</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span aria-current="page">{cagnotte.titre}</span>
      </nav>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-primary-soft">
            {cagnotte.image ? (
              <img src={urlFichier(cagnotte.image_miniature ?? cagnotte.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <SymboleNjangi taille={48} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[36px]">
                {cagnotte.titre}
              </h1>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${badge.classes}`}>{badge.texte}</span>
            </div>
            <p className="mt-2 text-base text-muted-foreground">
              <strong className="text-foreground">{formaterMontant(cagnotte.montant_collecte, cagnotte.devise)}</strong> collectés sur{' '}
              {formaterMontant(cagnotte.objectif, cagnotte.devise)} · {nb} donateur{nb > 1 ? 's' : ''} · {texteJours}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <Button variant="outline" to={`/cagnottes/${cagnotte.id_cagnotte}`}>
            Voir la page publique
          </Button>
          <Button to={`/cagnottes/${cagnotte.id_cagnotte}/modifier`}>
            <Pencil className="size-4" />
            Modifier
          </Button>
        </div>
      </div>
    </div>
  );
}
