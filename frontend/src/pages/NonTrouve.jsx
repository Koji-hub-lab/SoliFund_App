import { Button } from '../components/ui/Button';
import { SymboleNjangi } from '../components/Logo';

export default function NonTrouve() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-16 text-center">
      <SymboleNjangi taille={120} />
      <h1 className="mt-10 max-w-2xl font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[52px]">
        Cette page s'est perdue en chemin
      </h1>
      <p className="mt-4 max-w-md text-lg leading-[1.6] text-[#45524F]">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Button size="lg" to="/" className="mt-10">
        Retour à l'accueil
      </Button>
    </main>
  );
}
