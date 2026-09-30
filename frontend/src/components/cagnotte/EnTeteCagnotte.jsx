import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import PastilleInitiale from './PastilleInitiale';
import { formaterDate, formaterMoisAnnee } from '../../utils/format';

export default function EnTeteCagnotte({ cagnotte }) {
  const organisateur = cagnotte.organisateur;
  const { t } = useTranslation('cagnotte');

  return (
    <div className="mt-8">
      <h1 className="m-0 font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[44px] lg:text-[52px]">
        {cagnotte.titre}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        {organisateur && (
          <>
            <PastilleInitiale prenom={organisateur.prenom} teinte="lagune" />
            <div>
              <p className="text-base font-bold text-foreground">
                {t('page.organiseePar', { nom: `${organisateur.prenom} ${organisateur.initiale_nom}` })}
              </p>
              <p className="text-sm text-muted-foreground">{t('page.membreDepuis', { date: formaterMoisAnnee(organisateur.date_inscription) })}</p>
            </div>
            {organisateur.est_verifie && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">
                <Check className="size-4" />
                {t('page.emailVerifie')}
              </span>
            )}
          </>
        )}
        <p className="w-full text-sm text-muted-foreground sm:ml-auto sm:w-auto">
          {t('page.dates', { debut: formaterDate(cagnotte.date_debut), fin: formaterDate(cagnotte.date_fin) })}
        </p>
      </div>
    </div>
  );
}
