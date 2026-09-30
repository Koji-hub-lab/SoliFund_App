import { useTranslation } from 'react-i18next';
import { PenLine, Share2, Wallet } from 'lucide-react';

// cle : entrée de la zone de traduction « accueil » (etapes.<cle>.titre et .texte).
const steps = [
  { icon: PenLine, cle: 'creer' },
  { icon: Share2, cle: 'partager' },
  { icon: Wallet, cle: 'recuperer' },
];

export function HowItWorks() {
  const { t } = useTranslation('accueil');
  return (
    <section id="comment-ca-marche" className="scroll-mt-[88px] bg-primary-soft">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-[72px] lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{t('etapes.surTitre')}</p>
          <h2 className="mb-0 mt-3 font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground lg:text-[52px]">
            {t('etapes.titre')}
          </h2>
        </div>

        <ol className="mb-0 mt-12 grid list-none gap-6 p-0 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.cle} className="relative rounded-[32px] border border-border bg-card p-8">
                <span className="absolute right-7 top-5 font-display text-[64px] font-extrabold leading-none text-primary-soft" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="flex size-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <h3 className="mb-0 mt-6 font-display text-[22px] font-bold leading-tight text-foreground lg:text-[26px]">{t(`etapes.${step.cle}.titre`)}</h3>
                <p className="mt-3 text-[17px] leading-[1.6] text-[#45524F]">{t(`etapes.${step.cle}.texte`)}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
