import { useTranslation } from 'react-i18next';
import { ShieldCheck, Wallet, Smartphone } from 'lucide-react';

// Garanties réellement appliquées par la plateforme (vérification de l'email, retraits
// examinés par l'équipe, paiements MTN / Orange Money).
// cle : entrée de la zone de traduction « accueil » (confiance.<cle>.titre et .texte).
const garanties = [
  { icon: ShieldCheck, cle: 'organisateurs' },
  { icon: Wallet, cle: 'retraits' },
  { icon: Smartphone, cle: 'paiements' },
];

export function BlocConfiance() {
  const { t } = useTranslation('accueil');
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1400px] px-5 pb-16 sm:px-8 lg:px-[72px] lg:pb-24">
        <div className="grid gap-10 rounded-[40px] bg-encre p-8 sm:p-12 md:grid-cols-3 lg:p-16">
          {garanties.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.cle}>
                <Icon className="size-8 text-[#5CC9C2]" />
                <h3 className="mb-0 mt-5 font-display text-[22px] font-bold leading-tight text-[#FBF7F1] lg:text-[26px]">{t(`confiance.${g.cle}.titre`)}</h3>
                <p className="mt-3 text-[17px] leading-[1.6] text-[#B9C6C4]">{t(`confiance.${g.cle}.texte`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
