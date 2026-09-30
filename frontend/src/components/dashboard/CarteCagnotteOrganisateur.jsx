import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import BarreProgression from '../BarreProgression';
import { SymboleNjangi } from '../Logo';
import { urlFichier } from '../../api/axios';
import { formaterMontant } from '../../utils/format';
import { badgeStatutCagnotte, pourcentageAtteint } from '../../utils/cagnotte';

// Carte d'une cagnotte vue par son organisateur (tableau de bord, « Mes cagnottes »).
export default function CarteCagnotteOrganisateur({ cagnotte: c }) {
  const badge = badgeStatutCagnotte(c);
  const nb = c.nb_donateurs ?? 0;
  const { t } = useTranslation('tableau-de-bord');
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[24px] border border-border bg-card p-4 sm:flex-nowrap">
      <div className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-primary-soft">
        {c.image ? (
          <img src={urlFichier(c.image_miniature ?? c.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <SymboleNjangi taille={36} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-bold text-foreground">{c.titre}</p>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.classes}`}>{badge.texte}</span>
        </div>
        <BarreProgression pourcentage={pourcentageAtteint(c)} hauteur="h-2" className="mt-3" />
        <p className="mt-2 text-sm text-muted-foreground">
          {t('liste.resume', { collecte: formaterMontant(c.montant_collecte, c.devise), objectif: formaterMontant(c.objectif, c.devise) })} ·{' '}
          {t('liste.donateurs', { count: nb })}
        </p>
      </div>
      <Button variant="outline" to={`/mes-cagnottes/${c.id_cagnotte}`} className="w-full sm:w-auto">
        {t('liste.gerer')}
      </Button>
    </div>
  );
}
