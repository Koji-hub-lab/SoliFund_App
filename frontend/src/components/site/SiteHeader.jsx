import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, HeartHandshake } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'Parcourir les cagnottes', href: '#cagnottes' },
  { label: 'Aide', href: '#aide' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartHandshake className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Soli<span className="text-primary">fund</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {utilisateur ? (
            <>
              <Button variant="outline" to="/mes-cagnottes">Mes cagnottes</Button>
              <Button onClick={deconnecter}>Déconnexion</Button>
            </>
          ) : (
            <>
              <Button variant="outline" to="/login">Se connecter</Button>
              <Button to="/inscription">S'inscrire</Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              {utilisateur ? (
                <>
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate('/mes-cagnottes'); }}>Mes cagnottes</Button>
                  <Button className="w-full" onClick={() => { setOpen(false); deconnecter(); }}>Déconnexion</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); navigate('/login'); }}>Se connecter</Button>
                  <Button className="w-full" onClick={() => { setOpen(false); navigate('/inscription'); }}>S'inscrire</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}