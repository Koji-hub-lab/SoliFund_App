import { useTranslation } from 'react-i18next';
import { formaterDateHeure } from '../../utils/format';

// Frise chronologique verticale ; les actualités arrivent de la plus récente à la plus ancienne.
export default function ActualitesCagnotte({ actualites }) {
  const { t } = useTranslation('cagnotte');
  if (actualites.length === 0) {
    return <p className="text-[17px] text-muted-foreground">{t('page.sansActualite')}</p>;
  }

  return (
    <ol className="m-0 list-none border-l-2 border-primary-soft p-0 pl-8">
      {actualites.map((a, i) => (
        <li key={a.id_actualite} className="relative pb-8 last:pb-0">
          <span
            className={`absolute -left-[41px] top-1 size-4 rounded-full ring-4 ring-background ${i === 0 ? 'bg-primary' : 'bg-primary-soft'}`}
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">{formaterDateHeure(a.date_publication)}</p>
          <h3 className="m-0 mt-1 font-display text-xl font-bold text-foreground">{a.titre}</h3>
          <p className="mt-2 whitespace-pre-line text-[17px] leading-[1.6] text-[#45524F]">{a.contenu}</p>
        </li>
      ))}
    </ol>
  );
}
