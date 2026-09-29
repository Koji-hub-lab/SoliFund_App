import { Heart } from 'lucide-react';

const TEINTES = {
  lagune: 'bg-primary text-primary-foreground',
  claire: 'bg-primary-soft text-primary',
  ambre: 'bg-accent-soft text-[#7A5312]',
  anonyme: 'bg-secondary text-muted-foreground',
};

// Pastille ronde avec l'initiale d'un prénom (ou un cœur pour un don anonyme).
export default function PastilleInitiale({ prenom, teinte = 'claire', taille = 'size-11' }) {
  const anonyme = !prenom;
  return (
    <span
      className={`flex ${taille} shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${TEINTES[anonyme ? 'anonyme' : teinte]}`}
      aria-hidden="true"
    >
      {anonyme ? <Heart className="size-4" /> : prenom.charAt(0).toUpperCase()}
    </span>
  );
}
