// Carte squelette affichée pendant le chargement : même forme que CarteCagnotte,
// blocs #ECE4D8 arrondis qui pulsent doucement (sans animation si l'utilisateur la réduit).
export default function CarteCagnotteSquelette() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[28px] border border-border bg-card" aria-hidden="true">
      <div className="h-[200px] bg-border motion-safe:animate-pulse" />
      <div className="flex flex-col gap-3 p-6">
        <div className="h-5 w-3/4 rounded-full bg-border motion-safe:animate-pulse" />
        <div className="h-5 w-1/2 rounded-full bg-border motion-safe:animate-pulse" />
        <div className="mt-3 h-2.5 w-full rounded-full bg-border motion-safe:animate-pulse" />
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded-full bg-border motion-safe:animate-pulse" />
          <div className="h-4 w-20 rounded-full bg-border motion-safe:animate-pulse" />
        </div>
        <div className="h-4 w-28 rounded-full bg-border motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
