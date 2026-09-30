import { Link } from 'react-router-dom';
import Logo from '../Logo';
import { useTranslation } from 'react-i18next';

// Liens vers des pages existantes uniquement. Les ancres sont préfixées par « / »
// pour fonctionner depuis toutes les pages.
// titre et label : clés de traduction (zone « commun »).
const colonnes = [
  {
    titre: 'pied.decouvrir',
    liens: [
      { label: 'pied.toutesLesCagnottes', to: '/cagnottes' },
      { label: 'pied.lancer', to: '/creer-cagnotte' },
      { label: 'nav.commentCaMarche', href: '/#comment-ca-marche' },
    ],
  },
  {
    titre: 'pied.aide',
    liens: [
      { label: 'pied.creerCompte', to: '/inscription' },
      { label: 'nav.seConnecter', to: '/login' },
      { label: 'pied.motDePasseOublie', to: '/mot-de-passe-oublie' },
    ],
  },
  {
    titre: 'pied.legal',
    liens: [
      { label: 'pied.conditions', to: '/conditions' },
      { label: 'pied.confidentialite', to: '/confidentialite' },
    ],
  },
];

const classeLien = 'inline-flex min-h-11 items-center text-base text-[#B9C6C4]  decoration-2 underline-offset-[5px] hover:text-[#FBF7F1] hover:underline';

export function SiteFooter() {
  const { t } = useTranslation('commun');
  return (
    <footer id="aide" className="scroll-mt-[88px] bg-encre">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-[72px]">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo taille={40} variante="clair" />
            <p className="mt-5 max-w-sm text-base leading-[1.6] text-[#B9C6C4]">
              {t('pied.slogan')}
            </p>
          </div>

          {colonnes.map((colonne) => (
            <nav key={colonne.titre} aria-label={t(colonne.titre)}>
              <p className="font-display text-lg font-bold text-[#FBF7F1]">{t(colonne.titre)}</p>
              <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                {colonne.liens.map((lien) => (
                  <li key={lien.label}>
                    {lien.to ? (
                      <Link to={lien.to} className={classeLien}>{t(lien.label)}</Link>
                    ) : (
                      <a href={lien.href} className={classeLien}>{t(lien.label)}</a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#2C3D41] pt-6 sm:flex-row">
          <p className="text-sm text-[#B9C6C4]">{t('pied.droits', { annee: new Date().getFullYear() })}</p>
          <p className="text-sm text-[#B9C6C4]">{t('pied.base')}</p>
        </div>
      </div>
    </footer>
  );
}
