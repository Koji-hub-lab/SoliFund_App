import { useTranslation } from 'react-i18next';
import { LANGUES, changerLangue, langueActive } from '../../i18n';

// Sélecteur de langue discret « FR | EN » : la langue active est en gras Lagune.
// variante « clair » : sur fond Encre (barre latérale des espaces connectés).
export default function SelecteurLangue({ variante = 'couleur', className = '' }) {
  const { t } = useTranslation('commun');
  const active = langueActive();
  const couleurs =
    variante === 'clair'
      ? { active: 'font-bold text-[#5CC9C2]', autre: 'font-medium text-[#B9C6C4] hover:text-[#FBF7F1]', barre: 'text-[#2C3D41]' }
      : { active: 'font-bold text-primary', autre: 'font-medium text-muted-foreground hover:text-foreground', barre: 'text-border' };

  return (
    <div role="group" aria-label={t('langue.libelle')} className={`inline-flex items-center gap-1 text-sm ${className}`}>
      {LANGUES.map((langue, i) => (
        <span key={langue} className="inline-flex items-center gap-1">
          {i > 0 && <span className={couleurs.barre} aria-hidden="true">|</span>}
          <button
            type="button"
            lang={langue}
            aria-pressed={langue === active}
            aria-label={t(`langue.${langue}`)}
            onClick={() => changerLangue(langue)}
            className={`inline-flex min-h-11 min-w-8 items-center justify-center bg-transparent p-0 font-sans uppercase ${langue === active ? couleurs.active : couleurs.autre}`}
          >
            {langue}
          </button>
        </span>
      ))}
    </div>
  );
}
