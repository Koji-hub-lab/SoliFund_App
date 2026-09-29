import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { urlPartageCagnotte } from '../../api/axios';

// Bloc de partage : WhatsApp, Facebook et copie du lien. Le lien partagé est celui du backend
// (/partage/cagnottes/:id), seul capable d'afficher un aperçu avec la photo et le titre.
export default function PartageCagnotte({ idCagnotte, titre }) {
  const [etatCopie, setEtatCopie] = useState(''); // '' | 'copie' | 'erreur'
  const url = urlPartageCagnotte(idCagnotte);
  const texteWhatsApp = `${titre} — Soutenez cette cagnotte : ${url}`;

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
    <div className="rounded-[28px] bg-primary-soft p-6">
      <h2 className="font-display text-xl font-bold text-foreground">Partagez, ça compte aussi</h2>
      <p className="mt-1 text-sm text-[#45524F]">Chaque partage peut amener un nouveau donateur.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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
          aria-label="Copier le lien"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-transparent p-0 text-primary hover:bg-card"
        >
          <Link2 className="size-5" />
        </button>
        <span aria-live="polite" className="text-sm font-bold text-primary">
          {etatCopie === 'copie' && 'Lien copié'}
        </span>
      </div>
      {etatCopie === 'erreur' && (
        <p className="mt-2 text-sm text-destructive">Copie impossible : copiez l'adresse depuis la barre du navigateur.</p>
      )}
    </div>
  );
}
