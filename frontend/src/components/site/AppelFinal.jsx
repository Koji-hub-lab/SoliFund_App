import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { SymboleNjangi } from '../Logo';

export function AppelFinal() {
  const { t } = useTranslation('accueil');
  return (
    <section className="bg-background">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center px-5 pb-20 text-center sm:px-8 lg:px-[72px] lg:pb-28">
        <SymboleNjangi taille={72} />
        <h2 className="mb-0 mt-8 max-w-4xl font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[44px] lg:text-[56px]">
          {t('appel.debut')} <span className="text-primary">{t('appel.accent')}</span>{t('appel.fin')}
        </h2>
        {/* Courte explication du njangi pour les lecteurs qui ne connaissent pas le mot (anglais). */}
        {t('appel.noteNjangi') && (
          <p className="mt-4 max-w-xl text-base leading-[1.6] text-muted-foreground">{t('appel.noteNjangi')}</p>
        )}
        <Button size="lg" to="/creer-cagnotte" className="mt-10">
          {t('appel.lancer')}
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </section>
  );
}
