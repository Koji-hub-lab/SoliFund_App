// Choix de l'opérateur Mobile Money : deux cartes-boutons (utilisées pour le don et le retrait).
export const OPERATEURS = [
  { valeur: 'MTN_MOBILE_MONEY', etiquette: 'MTN', texte: 'Mobile Money', couleur: 'bg-[#FFCC00]', nom: 'MTN Mobile Money' },
  { valeur: 'ORANGE_MONEY', etiquette: 'Orange', texte: 'Money', couleur: 'bg-[#FF7900]', nom: 'Orange Money' },
];

export function nomOperateur(valeur) {
  return OPERATEURS.find((o) => o.valeur === valeur)?.nom ?? valeur;
}

const choixActif = 'border-primary bg-primary-soft text-primary';
const choixInactif = 'border-border bg-card text-foreground hover:border-primary/40';

export default function ChoixOperateur({ libelle, valeur, onChanger }) {
  return (
    <div>
      <p className="mb-2 block text-sm font-bold text-foreground">{libelle}</p>
      <div className="grid grid-cols-2 gap-3">
        {OPERATEURS.map((o) => {
          const actif = valeur === o.valeur;
          return (
            <button
              key={o.valeur}
              type="button"
              aria-pressed={actif}
              aria-label={`${libelle} ${o.nom}`}
              onClick={() => onChanger(o.valeur)}
              className={`flex items-center gap-2 rounded-[18px] border-2 px-3 py-3 text-left font-sans transition-colors ${actif ? choixActif : choixInactif}`}
            >
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-encre ${o.couleur}`}>{o.etiquette}</span>
              <span className="text-sm font-bold text-foreground">{o.texte}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
