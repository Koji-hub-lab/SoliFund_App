import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import PastilleInitiale from '../cagnotte/PastilleInitiale';
import { formaterDateRelative, formaterMontant } from '../../utils/format';
import { erreurTexte, titreSection } from '../cagnotte/classes';

function Chiffre({ libelle, valeur, enLagune = false }) {
  return (
    <div className="rounded-[28px] border border-border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{libelle}</p>
      <p className={`mt-3 break-words font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] ${enLagune ? 'text-primary' : 'text-foreground'}`}>
        {valeur}
      </p>
    </div>
  );
}

export default function ApercuGestion({ cagnotte, dons, infosDons, onVoirPlus, enCours, erreur }) {
  const nb = cagnotte.nb_donateurs ?? 0;
  const { t } = useTranslation('tableau-de-bord');
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Chiffre libelle={t('gestion.collecte')} valeur={formaterMontant(cagnotte.montant_collecte, cagnotte.devise)} enLagune />
        <Chiffre libelle={t('gestion.donateur', { count: nb })} valeur={nb} />
        <Chiffre libelle={t('gestion.disponible')} valeur={formaterMontant(cagnotte.montant_disponible ?? 0, cagnotte.devise)} />
      </div>

      <section className="rounded-[28px] border border-border bg-card p-6 sm:p-7">
        <h2 className={titreSection}>{t('gestion.donsRecus', { total: infosDons.total })}</h2>
        {dons.length === 0 ? (
          <p className="mt-4 text-base text-muted-foreground">{t('gestion.aucunDon')}</p>
        ) : (
          <ul className="m-0 mt-5 flex list-none flex-col divide-y divide-border p-0">
            {dons.map((d) => (
              <li key={d.id_don} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <PastilleInitiale prenom={d.donateur.prenom} taille="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">{d.donateur.prenom || t('gestion.anonyme')}</p>
                  <p className="text-sm text-muted-foreground">{formaterDateRelative(d.date_creation)}</p>
                  {d.message && <p className="mt-1 whitespace-pre-line break-words text-[15px] text-[#45524F]">« {d.message} »</p>}
                </div>
                <span className="shrink-0 font-bold text-primary">{formaterMontant(d.montant, d.devise)}</span>
              </li>
            ))}
          </ul>
        )}
        {infosDons.page < infosDons.pages && (
          <Button variant="outline" onClick={onVoirPlus} disabled={enCours} className="mt-6">
            {enCours ? t('commun:chargementPoints') : t('gestion.voirPlusDons')}
          </Button>
        )}
        {erreur && <p className={`mt-2 ${erreurTexte}`}>{erreur}</p>}
      </section>
    </div>
  );
}
