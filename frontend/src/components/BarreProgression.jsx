import { useEffect, useRef, useState } from 'react';

// Barre de progression de la charte : 10 px, fond Lagune claire, remplissage Lagune, bouts arrondis.
// Elle se remplit quand elle apparaît à l'écran (sans animation si l'utilisateur réduit les animations).
// hauteur : classe Tailwind de hauteur (10 px par défaut, h-3 pour 12 px).
export default function BarreProgression({ pourcentage, hauteur = 'h-2.5', className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const valeur = Math.max(0, Math.min(100, Math.round(pourcentage || 0)));

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={valeur}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`${hauteur} w-full overflow-hidden rounded-full bg-primary-soft ${className}`}
    >
      <div
        className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
        style={{ width: visible ? `${valeur}%` : '0%' }}
      />
    </div>
  );
}
