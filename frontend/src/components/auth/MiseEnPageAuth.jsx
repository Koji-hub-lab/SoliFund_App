import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import SelecteurLangue from '../ui/SelecteurLangue';

// Mise en page des pages de connexion / inscription / mot de passe oublié :
// photo voilée à gauche sur grand écran, formulaire centré (440 px max) sur fond Sable à droite.
export default function MiseEnPageAuth({ children }) {
  const { t } = useTranslation('auth');
  return (
    <main className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <img src="/cagnotte-solidaire.webp" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-encre/55" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="self-start " aria-label={t('retourAccueil')}>
            <Logo taille={40} variante="clair" />
          </Link>
          <div className="max-w-lg">
            <p className="font-display text-[40px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">{t('citation')}</p>
            {/* Courte explication du njangi, en anglais seulement. */}
            {t('noteNjangi') && <p className="mt-3 text-base text-[#FBF7F1]">{t('noteNjangi')}</p>}
          </div>
        </div>
      </aside>

      <section className="flex w-full flex-col px-5 py-8 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <Link to="/" className="inline-flex min-h-11 items-center lg:hidden" aria-label={t('retourAccueil')}>
            <Logo taille={36} />
          </Link>
          <SelecteurLangue />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </section>
    </main>
  );
}
