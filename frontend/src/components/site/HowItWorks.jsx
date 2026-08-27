import { PenLine, Share2, Wallet } from 'lucide-react';

const steps = [
  { icon: PenLine, title: 'Créez votre cagnotte', description: 'En 2 minutes seulement. Ajoutez un titre, une photo et votre objectif. Aucune compétence technique requise.' },
  { icon: Share2, title: 'Partagez à vos proches', description: 'Diffusez le lien de votre cagnotte sur WhatsApp, Facebook et vos autres réseaux en un seul clic.' },
  { icon: Wallet, title: 'Récupérez les fonds', description: "Retirez l'argent collecté directement sur Orange Money, MTN Mobile Money." },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="scroll-mt-16 bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Simple et rapide</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Comment ça marche ?</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Trois étapes suffisent pour lancer votre collecte et rassembler votre communauté.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative rounded-xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md">
                <span className="absolute right-6 top-6 text-4xl font-bold text-foreground/10">{i + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}