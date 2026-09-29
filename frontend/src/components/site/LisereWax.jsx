import { useId } from 'react';

// Motif wax ton sur ton (DESIGN.md, « Motif wax ») : jamais multicolore.
const PALETTES = {
  lagune: { fond: '#087F7A', motif: '#2E9C96' },
  clair: { fond: '#E3F2F0', motif: '#C3E4E0' },
};

// Remplit son conteneur avec le motif. `taille` : côté d'un motif en pixels.
export function MotifWax({ palette = 'lagune', taille = 24 }) {
  const id = `wax-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { fond, motif } = PALETTES[palette] ?? PALETTES.lagune;
  const m = taille / 2;
  return (
    <svg width="100%" height="100%" aria-hidden="true" focusable="false" className="block">
      <defs>
        <pattern id={id} width={taille} height={taille} patternUnits="userSpaceOnUse">
          <rect width={taille} height={taille} fill={fond} />
          <circle cx={m} cy={m} r={taille * 0.28} fill="none" stroke={motif} strokeWidth={taille * 0.08} />
          <circle cx={m} cy={m} r={taille * 0.09} fill={motif} />
          {[0, taille].flatMap((x) =>
            [0, taille].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={taille * 0.12} fill={motif} />),
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// Liseré de séparation de 24 px sur toute la largeur.
export default function LisereWax() {
  return (
    <div className="h-6 w-full" aria-hidden="true">
      <MotifWax palette="lagune" taille={24} />
    </div>
  );
}
