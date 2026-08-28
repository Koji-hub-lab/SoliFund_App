import { HeartHandshake } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NonTrouve() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-secondary px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <HeartHandshake className="size-7" />
      </span>
      <div>
        <h1 className="text-3xl font-bold text-foreground">Page introuvable</h1>
        <p className="mt-2 text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
      </div>
      <Button to="/">Retour à l'accueil</Button>
    </div>
  );
}