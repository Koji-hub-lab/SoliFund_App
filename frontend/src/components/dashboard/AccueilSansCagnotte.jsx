import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { SymboleNjangi } from '../Logo';

// Grande carte affichée quand l'organisateur n'a encore aucune cagnotte.
export default function AccueilSansCagnotte() {
  const { t } = useTranslation('tableau-de-bord');
  return (
    <div className="flex flex-col items-center rounded-[32px] border border-border bg-card px-6 py-14 text-center sm:px-12">
      <SymboleNjangi taille={72} />
      <h2 className="mt-6 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
        {t('vide.titre')}
      </h2>
      <p className="mt-3 max-w-md text-[17px] leading-[1.6] text-[#45524F]">
        {t('vide.texte')}
      </p>
      <Button size="lg" to="/creer-cagnotte" className="mt-8">
        <Plus className="size-5" />
        {t('accueil.creer')}
      </Button>
    </div>
  );
}
