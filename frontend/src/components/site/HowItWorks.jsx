import { PenLine, Share2, Wallet } from 'lucide-react';

const steps = [
  { icon: PenLine, title: 'Créez votre cagnotte', description: 'En 2 minutes seulement. Ajoutez un titre, une photo et votre objectif. Aucune compétence technique requise.' },
  { icon: Share2, title: 'Partagez à vos proches', description: 'Diffusez le lien de votre cagnotte sur WhatsApp, Facebook et vos autres réseaux en un seul clic.' },
  { icon: Wallet, title: 'Récupérez les fonds', description: "Retirez l'argent collecté directement sur Orange Money, MTN Mobile Money." },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="scroll-mt-[88px] bg-primary-soft">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-[72px] lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Simple et rapide</p>
          <h2 className="mb-0 mt-3 font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground lg:text-[52px]">
            Trois étapes pour rassembler votre communauté
          </h2>
        </div>

        <ol className="mb-0 mt-12 grid list-none gap-6 p-0 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative rounded-[32px] border border-border bg-card p-8">
                <span className="absolute right-7 top-5 font-display text-[64px] font-extrabold leading-none text-primary-soft" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="flex size-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <h3 className="mb-0 mt-6 font-display text-[22px] font-bold leading-tight text-foreground lg:text-[26px]">{step.title}</h3>
                <p className="mt-3 text-[17px] leading-[1.6] text-[#45524F]">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
