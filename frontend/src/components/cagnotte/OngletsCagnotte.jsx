// Barre d'onglets : l'onglet actif est souligné de 3 px Lagune, les compteurs sont en pilules Lagune claire.
export default function OngletsCagnotte({ onglets, actif, onChanger }) {
  return (
    <div role="tablist" className="flex gap-6 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_#ECE4D8] [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden">
      {onglets.map((o) => {
        const estActif = o.id === actif;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            id={`onglet-${o.id}`}
            aria-selected={estActif}
            aria-controls={`panneau-${o.id}`}
            onClick={() => onChanger(o.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-none border-b-[3px] bg-transparent px-0 pb-3 pt-2 font-sans text-base font-bold  ${
              estActif ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.libelle}
            {o.compteur !== undefined && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{o.compteur}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
