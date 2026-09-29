import { Search } from 'lucide-react';

// Éléments communs aux pages de l'espace administrateur (voir DESIGN.md).

export function EnTeteAdmin({ titre, sousTitre }) {
  return (
    <div>
      <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">{titre}</h1>
      {sousTitre && <p className="mt-2 text-lg text-muted-foreground">{sousTitre}</p>}
    </div>
  );
}

export function RecherchePilule({ valeur, onChange, placeholder, libelle }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-6 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        aria-label={libelle}
        placeholder={placeholder}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className="h-[60px] w-full rounded-full border-2 border-border bg-card pl-14 pr-6 font-sans text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </div>
  );
}

// filtres : [{ valeur, libelle }] ; l'actif est en Encre.
export function FiltresPilules({ filtres, actif, onChanger }) {
  return (
    <div className="flex flex-wrap gap-2">
      {filtres.map((f) => {
        const estActif = f.valeur === actif;
        return (
          <button
            key={f.valeur || 'tous'}
            type="button"
            aria-pressed={estActif}
            onClick={() => onChanger(f.valeur)}
            className={`inline-flex min-h-11 items-center rounded-full border px-5 py-2.5 font-sans text-sm font-bold transition-colors ${
              estActif ? 'border-encre bg-encre text-primary-foreground hover:bg-encre' : 'border-border bg-card text-foreground hover:bg-secondary'
            }`}
          >
            {f.libelle}
          </button>
        );
      })}
    </div>
  );
}

// Carte blanche contenant une liste : une ligne par élément, séparées par une bordure #ECE4D8.
export function CarteListe({ vide, messageVide, children }) {
  return (
    <section className="rounded-[28px] border border-border bg-card px-6 py-2 sm:px-7">
      {vide ? (
        <p className="py-10 text-center text-base text-muted-foreground">{messageVide}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">{children}</ul>
      )}
    </section>
  );
}

export const classeLigne = 'flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between';
