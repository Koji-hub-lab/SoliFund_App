import { ShieldCheck, Wallet, Smartphone } from 'lucide-react';

// Garanties réellement appliquées par la plateforme (vérification de l'email, retraits
// examinés par l'équipe, paiements MTN / Orange Money).
const garanties = [
  {
    icon: ShieldCheck,
    titre: 'Organisateurs vérifiés',
    texte: "Chaque organisateur confirme son adresse email avant de pouvoir créer une cagnotte.",
  },
  {
    icon: Wallet,
    titre: 'Retraits contrôlés',
    texte: "Chaque demande de retrait est examinée par notre équipe avant d'être versée.",
  },
  {
    icon: Smartphone,
    titre: 'Paiements locaux',
    texte: 'Donnez avec MTN Mobile Money ou Orange Money, sans carte bancaire.',
  },
];

export function BlocConfiance() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1400px] px-5 pb-16 sm:px-8 lg:px-[72px] lg:pb-24">
        <div className="grid gap-10 rounded-[40px] bg-encre p-8 sm:p-12 md:grid-cols-3 lg:p-16">
          {garanties.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.titre}>
                <Icon className="size-8 text-[#5CC9C2]" />
                <h3 className="mb-0 mt-5 font-display text-[22px] font-bold leading-tight text-[#FBF7F1] lg:text-[26px]">{g.titre}</h3>
                <p className="mt-3 text-[17px] leading-[1.6] text-[#B9C6C4]">{g.texte}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
