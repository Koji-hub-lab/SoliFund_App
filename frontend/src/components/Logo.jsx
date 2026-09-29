// Logo SoliFund : le cercle njangi (6 cercles autour d'un cercle central Ambre) et le wordmark.
// Voir frontend/DESIGN.md, section « Logo ».

const POSITIONS = [
  [96, 60],
  [78, 91.2],
  [42, 91.2],
  [24, 60],
  [42, 28.8],
  [78, 28.8],
];

const VARIANTES = {
  couleur: { cercles: '#087F7A', soli: '#17262A', fund: '#087F7A' },
  clair: { cercles: '#5CC9C2', soli: '#FBF7F1', fund: '#FBF7F1' },
};

export function SymboleNjangi({ taille = 36, variante = 'couleur' }) {
  const { cercles } = VARIANTES[variante] ?? VARIANTES.couleur;
  return (
    <svg width={taille} height={taille} viewBox="0 0 120 120" aria-hidden="true" className="shrink-0">
      {POSITIONS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="15" fill={cercles} />
      ))}
      <circle cx="60" cy="60" r="15" fill="#E9A23B" />
    </svg>
  );
}

// taille : taille du symbole en pixels (le wordmark suit proportionnellement).
export default function Logo({ taille = 36, variante = 'couleur', avecTexte = true }) {
  const couleurs = VARIANTES[variante] ?? VARIANTES.couleur;
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label="SoliFund">
      <SymboleNjangi taille={taille} variante={variante} />
      {avecTexte && (
        <span
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: Math.round(taille * 0.6), lineHeight: 1, color: couleurs.soli }}
          aria-hidden="true"
        >
          Soli<span style={{ color: couleurs.fund }}>Fund</span>
        </span>
      )}
    </span>
  );
}
