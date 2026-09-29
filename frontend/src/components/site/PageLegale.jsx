import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

const conteneur = 'mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-[72px]';

// Mise en page des pages d'informations légales (conditions, confidentialité) : titre, avertissement,
// sommaire (colonne collée à gauche sur grand écran) et sections numérotées.
// sections : [{ id, titre, contenu }] ; contenu : éléments JSX (paragraphes, listes).
export default function PageLegale({ titre, introduction, miseAJour, sections }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className={`${conteneur} flex-1 py-12 lg:py-16`}>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Informations légales</p>
        <h1 className="mt-3 max-w-4xl font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[52px]">
          {titre}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-[1.6] text-[#45524F]">{introduction}</p>
        <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {miseAJour}</p>

        <div className="mt-8 max-w-3xl rounded-[28px] bg-primary-soft p-6">
          <p className="font-bold text-foreground">Texte de base, à faire relire par un juriste</p>
          <p className="mt-1 text-base leading-[1.6] text-[#45524F]">
            Ce document est une première version rédigée pour le lancement de SoliFund. Il doit être relu et validé par
            un juriste au regard du droit camerounais avant toute mise en ligne publique. Les passages entre crochets
            sont à compléter.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Sommaire" className="self-start rounded-[28px] border border-border bg-card p-6 lg:sticky lg:top-[112px]">
            <p className="font-display text-lg font-bold text-foreground">Sommaire</p>
            <ol className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex min-h-11 items-baseline gap-2 py-2.5 text-[15px] font-medium text-[#45524F] decoration-2 underline-offset-[5px] hover:text-primary hover:underline"
                  >
                    <span className="font-bold text-primary">{i + 1}.</span>
                    {s.titre}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex max-w-3xl flex-col gap-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-[112px]">
                <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">
                  {i + 1}. {s.titre}
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-[17px] leading-[1.6] text-[#45524F] [&_li]:ml-5 [&_li]:list-disc [&_ul]:m-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:p-0">
                  {s.contenu}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
