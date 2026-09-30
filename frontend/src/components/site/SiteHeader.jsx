import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../Logo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import SelecteurLangue from '../ui/SelecteurLangue';

// href : ancres de la page d'accueil, préfixées par « / » pour fonctionner depuis les autres pages.
// to : pages de l'application (lien React Router).
// label : clé de traduction (zone « commun »).
const navLinks = [
  { label: 'nav.commentCaMarche', href: '/#comment-ca-marche' },
  { label: 'nav.parcourir', to: '/cagnottes' },
  { label: 'nav.aide', href: '/#aide' },
];

function LienNav({ lien, className, onClick }) {
  const { t } = useTranslation('commun');
  if (lien.to) {
    return <Link to={lien.to} className={className} onClick={onClick}>{t(lien.label)}</Link>;
  }
  return <a href={lien.href} className={className} onClick={onClick}>{t(lien.label)}</a>;
}

const classeLienNav =
  'text-base font-medium text-encre  decoration-2 underline-offset-[5px] hover:underline';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('commun');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-[72px]">
        <Link to="/" className="shrink-0 ">
          <Logo taille={40} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((lien) => (
            <LienNav key={lien.label} lien={lien} className={classeLienNav} />
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <SelecteurLangue />
          {utilisateur ? (
            <>
              <button
                type="button"
                onClick={deconnecter}
                className="inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-base font-bold text-encre decoration-2 underline-offset-[5px] hover:underline"
              >
                {t('nav.deconnexion')}
              </button>
              <Button to="/dashboard">{t('nav.monEspace')}</Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-base font-bold text-encre decoration-2 underline-offset-[5px] hover:underline">
                {t('nav.seConnecter')}
              </Link>
              <Button to="/inscription">{t('nav.sInscrire')}</Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-card p-0 text-foreground hover:bg-secondary lg:hidden"
          aria-label={open ? t('nav.fermerMenu') : t('nav.ouvrirMenu')}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-[1400px] flex-col gap-1 px-5 py-4 sm:px-8">
            {navLinks.map((lien) => (
              <LienNav
                key={lien.label}
                lien={lien}
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-3 text-base font-medium text-encre hover:bg-secondary "
              />
            ))}
            <SelecteurLangue className="px-4" />
            <div className="mt-3 flex flex-col gap-3">
              {utilisateur ? (
                <>
                  <Button className="w-full" onClick={() => { setOpen(false); navigate('/dashboard'); }}>{t('nav.monEspace')}</Button>
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); deconnecter(); }}>{t('nav.deconnexion')}</Button>
                </>
              ) : (
                <>
                  <Button className="w-full" onClick={() => { setOpen(false); navigate('/inscription'); }}>{t('nav.sInscrire')}</Button>
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate('/login'); }}>{t('nav.seConnecter')}</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
