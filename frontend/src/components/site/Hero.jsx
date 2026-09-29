import { ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { MotifWax } from './LisereWax';

export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-[1400px] items-center gap-16 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-[72px] lg:py-24">
        <div className="flex flex-col items-start text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-sm font-bold text-primary">
            <ShieldCheck className="size-4" />
            Cagnottes 100 % sécurisées au Cameroun
          </span>

          <h1 className="mb-0 mt-6 font-display text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[56px] lg:text-[72px]">
            Réalisez vos projets, <span className="text-primary">soutenez vos proches.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-[1.6] text-[#45524F] lg:text-xl">
            La solution de cagnotte sécurisée au Cameroun. Mariage, anniversaire, deuil ou projet solidaire — collectez et partagez en toute confiance.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button size="lg" to="/creer-cagnotte">
              Lancer ma cagnotte
              <ArrowRight className="size-5" />
            </Button>
            <Button size="lg" variant="outline" href="#cagnottes">
              Parcourir les cagnottes
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Paiements acceptés</span>
            <span className="rounded-full bg-[#FFCC00] px-3 py-1 text-xs font-bold text-encre">MTN MoMo</span>
            <span className="rounded-full bg-[#FF7900] px-3 py-1 text-xs font-bold text-encre">Orange Money</span>
          </div>
        </div>

        <div className="relative mx-auto mt-6 w-full max-w-[600px] lg:mt-0 lg:max-w-none">
          {/* Carré décoratif wax, décalé en haut à droite derrière la photo. */}
          <div className="absolute -right-4 -top-4 h-[85%] w-[85%] overflow-hidden rounded-[36px] sm:-right-8 sm:-top-8" aria-hidden="true">
            <MotifWax palette="clair" taille={32} />
          </div>

          <div className="relative overflow-hidden rounded-[36px]">
            {/* Seule image chargée sans attendre (loading="lazy" partout ailleurs) : elle est en haut de l'accueil. */}
            <img
              src="/hero-solidarite.webp"
              fetchPriority="high"
              alt="Un groupe de proches réunis et souriants célébrant leur solidarité"
              className="aspect-[5/4] w-full object-cover"
            />
          </div>

          {/* Carte flottante posée sur la photo : seule ombre autorisée par la charte. */}
          <div className="absolute -bottom-8 left-4 flex items-center gap-3 rounded-[28px] border border-border bg-card p-4 pr-6 shadow-[0_12px_32px_rgba(23,38,42,0.14)] sm:-left-8">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary">
              <Lock className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold leading-tight text-foreground">Fonds protégés</p>
              <p className="text-sm text-muted-foreground">Retrait sur votre Mobile Money</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
