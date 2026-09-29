import { Link } from 'react-router-dom';
import Logo from '../Logo';

// Mise en page des pages de connexion / inscription / mot de passe oublié :
// photo voilée à gauche sur grand écran, formulaire centré (440 px max) sur fond Sable à droite.
export default function MiseEnPageAuth({ children }) {
  return (
    <main className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <img src="/cagnotte-solidaire.webp" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-encre/55" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="self-start " aria-label="Retour à l'accueil">
            <Logo taille={40} variante="clair" />
          </Link>
          <p className="max-w-lg font-display text-[40px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
            Comme au njangi, chacun met un peu, et tout le monde avance.
          </p>
        </div>
      </aside>

      <section className="flex w-full flex-col px-5 py-8 sm:px-8 lg:w-1/2 lg:px-12">
        <Link to="/" className="inline-flex min-h-11 items-center self-start lg:hidden" aria-label="Retour à l'accueil">
          <Logo taille={36} />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </section>
    </main>
  );
}
