import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { SymboleNjangi } from '../Logo';

export function AppelFinal() {
  return (
    <section className="bg-background">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center px-5 pb-20 text-center sm:px-8 lg:px-[72px] lg:pb-28">
        <SymboleNjangi taille={72} />
        <h2 className="mb-0 mt-8 max-w-4xl font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[44px] lg:text-[56px]">
          Comme au njangi, <span className="text-primary">chacun met un peu</span>, et tout le monde avance.
        </h2>
        <Button size="lg" to="/creer-cagnotte" className="mt-10">
          Lancer ma cagnotte
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </section>
  );
}
