import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';

// Lien de navigation en pilule sur fond Encre (voir DESIGN.md).
function classeLien(actif) {
  return `flex h-12 items-center gap-3 rounded-full px-4 text-[15px]  transition-colors  ${
    actif ? 'bg-primary font-bold text-primary-foreground' : 'font-medium text-[#B9C6C4] hover:bg-[#2C3D41] hover:text-[#FBF7F1]'
  }`;
}

// Mise en page des espaces connectés (organisateur, administration) : barre latérale Encre fixe,
// menu mobile, zone de contenu sur fond Sable.
// liens : [{ label, href, icon, compteur?, actifSi? }] ; etiquette : élément affiché sous le logo.
// liensSecondaires : liens hors de l'espace (ex. pages publiques), séparés des autres par un trait.
export default function EspaceLayout({ liens, liensSecondaires = [], etiquette, lienLogo = '/', children }) {
  const { utilisateur, deconnecter } = useAuth();
  const location = useLocation();
  const [ouvert, setOuvert] = useState(false);

  const nomComplet = [utilisateur?.prenom, utilisateur?.nom].filter(Boolean).join(' ');
  const initiale = (utilisateur?.prenom || utilisateur?.nom || '?').charAt(0).toUpperCase();

  function estActif(lien) {
    if (lien.actifSi) return lien.actifSi(location.pathname);
    return location.pathname === lien.href || location.pathname.startsWith(`${lien.href}/`);
  }

  function rendreLien(lien) {
    const Icon = lien.icon;
    const actif = estActif(lien);
    return (
      <Link
        key={lien.href}
        to={lien.href}
        onClick={() => setOuvert(false)}
        className={classeLien(actif)}
        aria-current={actif ? 'page' : undefined}
      >
        <Icon className="size-5 shrink-0" />
        {lien.label}
        {lien.compteur > 0 && (
          <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-encre">{lien.compteur}</span>
        )}
      </Link>
    );
  }

  const contenuSidebar = (
    <>
      <div className="px-6 pb-8 pt-7">
        <Link to={lienLogo} className="inline-flex min-h-11 items-center">
          <Logo taille={36} variante="clair" />
        </Link>
        {etiquette && <div className="mt-3">{etiquette}</div>}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4">
        {liens.map(rendreLien)}
        {liensSecondaires.length > 0 && (
          <>
            <hr className="mx-4 my-3 border-0 border-t border-[#2C3D41]" />
            {liensSecondaires.map(rendreLien)}
          </>
        )}
      </nav>

      <div className="border-t border-[#2C3D41] px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-encre" aria-hidden="true">
            {initiale}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-[#FBF7F1]">{nomComplet}</p>
            <p className="truncate text-sm text-[#8FA09D]">{utilisateur?.email}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-[#B9C6C4]">
          <Link to="/" className="text-[#B9C6C4] decoration-1 underline-offset-4 hover:text-[#FBF7F1] hover:underline">
            Retour au site
          </Link>
          <span aria-hidden="true"> · </span>
          <button
            type="button"
            onClick={deconnecter}
            className="inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-normal text-[#B9C6C4] decoration-1 underline-offset-4 hover:text-[#FBF7F1] hover:underline"
          >
            Déconnexion
          </button>
        </p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barre latérale fixe (grand écran) */}
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col bg-encre lg:flex">
        {contenuSidebar}
      </aside>

      {/* Menu mobile */}
      {ouvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-encre/60" onClick={() => setOuvert(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-encre" aria-label="Menu">
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer le menu"
              className="absolute right-4 top-6 inline-flex size-10 items-center justify-center rounded-full border border-[#2C3D41] bg-transparent p-0 text-[#FBF7F1] hover:bg-[#2C3D41]"
            >
              <X className="size-5" />
            </button>
            {contenuSidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile */}
        <div className="flex h-16 items-center justify-between bg-encre px-5 lg:hidden">
          <Link to={lienLogo} className="inline-flex min-h-11 items-center ">
            <Logo taille={30} variante="clair" />
          </Link>
          <button
            type="button"
            onClick={() => setOuvert(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={ouvert}
            className="inline-flex size-11 items-center justify-center rounded-full border border-[#2C3D41] bg-transparent p-0 text-[#FBF7F1] hover:bg-[#2C3D41]"
          >
            <Menu className="size-5" />
          </button>
        </div>

        <main className="flex-1 px-5 py-8 sm:px-8 lg:px-14 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
