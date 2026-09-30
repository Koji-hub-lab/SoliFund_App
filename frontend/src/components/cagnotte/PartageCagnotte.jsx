import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { urlPartageCagnotte } from '../../api/axios';

// Boutons de partage : WhatsApp, Facebook et copie du lien. Le lien partagé est celui du backend
// (/partage/cagnottes/:id), seul capable d'afficher un aperçu avec la photo et le titre.
export function BoutonsPartage({ idCagnotte, titre }) {
  const [etatCopie, setEtatCopie] = useState(''); // '' | 'copie' | 'erreur'
  const { t } = useTranslation('cagnotte');
  const url = urlPartageCagnotte(idCagnotte);
  const texteWhatsApp = t('partage.whatsapp', { titre, url });

  useEffect(() => {
    if (etatCopie !== 'copie') return undefined;
    const minuteur = setTimeout(() => setEtatCopie(''), 2000);
    return () => clearTimeout(minuteur);
  }, [etatCopie]);

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(url);
      setEtatCopie('copie');
    } catch {
      setEtatCopie('erreur');
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button href={`https://wa.me/?text=${encodeURIComponent(texteWhatsApp)}`} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </Button>
        <Button
          variant="outline"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </Button>
        <button
          type="button"
          onClick={copierLien}
          aria-label={t('partage.copier')}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-transparent p-0 text-primary hover:bg-card"
        >
          <Link2 className="size-5" />
        </button>
        <span aria-live="polite" className="text-sm font-bold text-primary">
          {etatCopie === 'copie' && t('partage.copie')}
        </span>
      </div>
      {etatCopie === 'erreur' && (
        <p className="mt-2 text-sm text-destructive">{t('partage.copieImpossible')}</p>
      )}
    </>
  );
}

// Bloc de partage de la page d'une cagnotte.
export default function PartageCagnotte({ idCagnotte, titre }) {
  const { t } = useTranslation('cagnotte');
  return (
    <div className="rounded-[28px] bg-primary-soft p-6">
      <h2 className="font-display text-xl font-bold text-foreground">{t('partage.titre')}</h2>
      <p className="mt-1 text-sm text-[#45524F]">{t('partage.texte')}</p>
      <div className="mt-4">
        <BoutonsPartage idCagnotte={idCagnotte} titre={titre} />
      </div>
    </div>
  );
}
