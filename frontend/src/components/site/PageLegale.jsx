import { Trans, useTranslation } from 'react-i18next';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { formaterDate } from '../../utils/format';

const conteneur = 'mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-[72px]';

// Mise en page des pages d'informations légales (conditions, confidentialité) : titre, avertissement,
// sommaire (colonne collée à gauche sur grand écran) et sections numérotées.
// Les textes viennent de la zone « legal » : cle = « conditions » ou « confidentialite »,
// sections = identifiants des sections dans l'ordre, miseAJour = date ISO,
// composants = éléments insérés dans les textes (<lien>, <taux/>).
export default function PageLegale({ cle, sections, miseAJour, composants }) {
  const { t } = useTranslation('legal');

  // Un bloc est un paragraphe (texte) ou une liste ({ liste: [...] }).
  function afficherBloc(bloc, chemin) {
    if (typeof bloc === 'string') {
      return <p key={chemin}><Trans t={t} i18nKey={chemin} components={composants} /></p>;
    }
    return (
      <ul key={chemin}>
        {bloc.liste.map((_, j) => (
          <li key={j}><Trans t={t} i18nKey={`${chemin}.liste.${j}`} components={composants} /></li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className={`${conteneur} flex-1 py-12 lg:py-16`}>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{t('surtitre')}</p>
        <h1 className="mt-3 max-w-4xl font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[52px]">
          {t(`${cle}.titre`)}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-[1.6] text-[#45524F]">{t(`${cle}.introduction`)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('miseAJour', { date: formaterDate(miseAJour) })}</p>

        <div className="mt-8 max-w-3xl rounded-[28px] bg-primary-soft p-6">
          <p className="font-bold text-foreground">{t('avertissementTitre')}</p>
          <p className="mt-1 text-base leading-[1.6] text-[#45524F]">
            {t('avertissement')}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={t('sommaire')} className="self-start rounded-[28px] border border-border bg-card p-6 lg:sticky lg:top-[112px]">
            <p className="font-display text-lg font-bold text-foreground">{t('sommaire')}</p>
            <ol className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
              {sections.map((id, i) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="inline-flex min-h-11 items-baseline gap-2 py-2.5 text-[15px] font-medium text-[#45524F] decoration-2 underline-offset-[5px] hover:text-primary hover:underline"
                  >
                    <span className="font-bold text-primary">{i + 1}.</span>
                    {t(`${cle}.sections.${id}.titre`)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex max-w-3xl flex-col gap-10">
            {sections.map((id, i) => (
              <section key={id} id={id} className="scroll-mt-[112px]">
                <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">
                  {i + 1}. {t(`${cle}.sections.${id}.titre`)}
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-[17px] leading-[1.6] text-[#45524F] [&_li]:ml-5 [&_li]:list-disc [&_ul]:m-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:p-0">
                  {t(`${cle}.sections.${id}.blocs`, { returnObjects: true }).map((bloc, j) =>
                    afficherBloc(bloc, `${cle}.sections.${id}.blocs.${j}`),
                  )}
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
