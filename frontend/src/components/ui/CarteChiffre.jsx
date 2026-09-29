import { MotifWax } from '../site/LisereWax';

const TEINTES = {
  blanche: { carte: 'border border-border bg-card', libelle: 'text-muted-foreground', valeur: 'text-foreground' },
  lagune: { carte: 'bg-primary text-primary-foreground', libelle: 'text-primary-foreground/90', valeur: 'text-primary-foreground' },
  ambre: { carte: 'bg-accent-soft', libelle: 'text-[#7A5312]', valeur: 'text-[#7A5312]' },
};

// Carte de chiffre (tableaux de bord) : blanche, Lagune (avec un cercle wax dans le coin) ou Ambre clair.
// valeurEnLagune : chiffre en Lagune sur carte blanche ; children : lien éventuel sous le chiffre.
export default function CarteChiffre({ libelle, valeur, teinte = 'blanche', valeurEnLagune = false, children }) {
  const t = TEINTES[teinte] ?? TEINTES.blanche;
  const couleurValeur = valeurEnLagune && teinte === 'blanche' ? 'text-primary' : t.valeur;
  return (
    <div className={`relative overflow-hidden rounded-[28px] p-6 ${t.carte}`}>
      {teinte === 'lagune' && (
        <div className="absolute -right-16 -top-16 size-36 overflow-hidden rounded-full" aria-hidden="true">
          <MotifWax palette="lagune" taille={20} />
        </div>
      )}
      <p className={`relative text-sm font-medium ${t.libelle}`}>{libelle}</p>
      <p className={`relative mt-3 break-words font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] ${couleurValeur}`}>
        {valeur}
      </p>
      {children && <div className="relative mt-3">{children}</div>}
    </div>
  );
}
