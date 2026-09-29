// Squelettes de chargement (même style que CarteCagnotteSquelette) : blocs #ECE4D8 arrondis qui
// pulsent doucement, sans animation si l'utilisateur la réduit. Annoncés « Chargement » aux lecteurs d'écran.

export function Bloc({ className = '' }) {
  return <div className={`bg-border motion-safe:animate-pulse ${className}`} />;
}

function Zone({ children, className = '' }) {
  return (
    <div role="status" aria-label="Chargement" className={className}>
      <span className="sr-only">Chargement...</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

// Titre et sous-titre de page.
export function SqueletteEnTete() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Bloc className="h-10 w-64 max-w-full rounded-full" />
      <Bloc className="h-5 w-80 max-w-full rounded-full" />
    </div>
  );
}

// Rangée de cartes de chiffres.
export function SqueletteChiffres({ nombre = 4 }) {
  return (
    <Zone className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className="rounded-[28px] border border-border bg-card p-6">
          <Bloc className="h-4 w-28 rounded-full" />
          <Bloc className="mt-4 h-10 w-36 rounded-full" />
        </div>
      ))}
    </Zone>
  );
}

// Carte blanche avec des lignes (listes admin, notifications, cagnottes de l'organisateur).
export function SqueletteListe({ lignes = 4 }) {
  return (
    <Zone className="rounded-[28px] border border-border bg-card px-6 py-2 sm:px-7">
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border py-5 last:border-0">
          <Bloc className="size-11 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Bloc className="h-4 w-1/2 rounded-full" />
            <Bloc className="h-4 w-3/4 rounded-full" />
          </div>
          <Bloc className="hidden h-10 w-24 rounded-full sm:block" />
        </div>
      ))}
    </Zone>
  );
}

// Formulaire dans une carte (modification d'une cagnotte).
export function SqueletteFormulaire({ champs = 4 }) {
  return (
    <Zone className="flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
      {Array.from({ length: champs }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Bloc className="h-4 w-32 rounded-full" />
          <Bloc className="h-[52px] w-full rounded-[16px]" />
        </div>
      ))}
    </Zone>
  );
}

// Page publique d'une cagnotte : photo et titre à gauche, carte de don à droite.
export function SqueletteCagnotte() {
  return (
    <Zone className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div>
        <Bloc className="h-[260px] w-full rounded-[36px] sm:h-[400px] lg:h-[520px]" />
        <Bloc className="mt-8 h-12 w-3/4 rounded-full" />
        <Bloc className="mt-5 h-5 w-1/2 rounded-full" />
      </div>
      <div className="rounded-[32px] border border-border bg-card p-6 sm:p-7">
        <Bloc className="h-11 w-48 rounded-full" />
        <Bloc className="mt-3 h-4 w-60 rounded-full" />
        <Bloc className="mt-6 h-3 w-full rounded-full" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Bloc className="h-16 rounded-[18px]" />
          <Bloc className="h-16 rounded-[18px]" />
          <Bloc className="h-16 rounded-[18px]" />
        </div>
        <Bloc className="mt-6 h-[60px] w-full rounded-full" />
      </div>
    </Zone>
  );
}

// Espace connecté (organisateur ou admin) pendant le chargement du code de la page (React.lazy) :
// même structure qu'EspaceLayout, barre latérale Encre et contenu sur fond Sable.
export function SqueletteEspace() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 hidden h-screen w-[280px] shrink-0 bg-encre lg:block" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-16 bg-encre lg:hidden" aria-hidden="true" />
        <div className="flex-1 px-5 py-8 sm:px-8 lg:px-14 lg:py-12">
          <div className="flex flex-col gap-8">
            <SqueletteEnTete />
            <SqueletteListe lignes={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
