import { HeartHandshake } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer id="aide" className="scroll-mt-16 border-t border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartHandshake className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Soli<span className="text-primary">fund</span>
          </span>
        </div>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
          La plateforme de cagnotte en ligne sécurisée pensée pour le Cameroun.
        </p>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Solifund. Tous droits réservés.</p>
          <p className="text-sm text-muted-foreground">Fièrement basé au Cameroun</p>
        </div>
      </div>
    </footer>
  );
}