import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-24">
        <div className="flex flex-col items-start text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <ShieldCheck className="size-4" />
            Cagnottes 100% sécurisées au Cameroun
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            Réalisez vos projets et soutenez vos proches en quelques clics
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            La solution de cagnotte sécurisée au Cameroun. Mariage, anniversaire, deuil ou projet solidaire — collectez et partagez en toute confiance.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" to="/creer-cagnotte" className="shadow-lg">
              Lancer ma cagnotte
              <ArrowRight className="size-5" />
            </Button>
            <a href="#cagnottes">
              <Button size="lg" variant="outline">Parcourir les cagnottes</Button>
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            <img
              src="/hero-solidarite.png"
              alt="Un groupe de proches réunis et souriants célébrant leur solidarité"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-lg sm:flex">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent/20">
              <ShieldCheck className="size-5 text-accent" />
            </span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Fonds protégés</p>
              <p className="text-muted-foreground">Retrait Mobile Money instantané</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}