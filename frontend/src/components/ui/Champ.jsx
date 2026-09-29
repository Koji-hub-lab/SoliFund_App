// Champ de formulaire de la charte : libellé + champ + message d'erreur (et aide facultative).
// Champ de 52 px, bordure 2 px #ECE4D8, rayon 16 px, bordure Lagune au focus.
// `as` : 'input' (par défaut), 'select' ou 'textarea' ; les autres props vont au champ lui-même.
// `prefixe` : texte affiché au début du champ (ex. « +237 ») ; `suffixe` : élément placé à droite
// (ex. bouton pour afficher le mot de passe).

export const classeChamp =
  'w-full rounded-[16px] border-2 border-border bg-card px-4 font-sans text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground';

export default function Champ({ id, libelle, erreur, aide, as = 'input', prefixe, suffixe, className = '', children, ...props }) {
  const Element = as;
  const hauteur = as === 'textarea' ? 'min-h-[120px] py-3' : 'h-[52px]';
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const bordureErreur = erreur ? 'border-destructive focus:border-destructive' : '';
  const marges = `${prefixe ? 'pl-[4.5rem]' : ''} ${suffixe ? 'pr-12' : ''}`;

  return (
    <div className={className}>
      {libelle && (
        <label htmlFor={id} className="mb-2 block text-sm font-bold text-foreground">
          {libelle}
        </label>
      )}
      <div className="relative">
        {prefixe && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-foreground" aria-hidden="true">
            {prefixe}
          </span>
        )}
        <Element
          id={id}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={[idErreur, idAide].filter(Boolean).join(' ') || undefined}
          className={`${classeChamp} ${hauteur} ${bordureErreur} ${marges}`}
          {...props}
        >
          {children}
        </Element>
        {suffixe && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffixe}</div>}
      </div>
      {erreur && <p id={idErreur} className="mt-1.5 text-sm text-destructive">{erreur}</p>}
      {aide && <p id={idAide} className="mt-1.5 text-sm text-muted-foreground">{aide}</p>}
    </div>
  );
}
