import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import ChoixOperateur, { nomOperateur } from '../cagnotte/ChoixOperateur';
import api from '../../api/axios';
import { formaterDate, formaterMontant } from '../../utils/format';
import { messageNumeroInvalide, normaliserNumero } from '../../utils/telephone';
import { champPilule, erreurTexte, titreSection } from '../cagnotte/classes';
import { BadgeStatut, statutsRetrait } from '../../utils/statuts';
import { calculerCommission, formaterTaux, useTauxCommission } from '../../utils/commission';

const libelle = 'mb-2 block text-sm font-bold text-foreground';

export default function RetraitsGestion({ cagnotte, retraits, executer, charger, enCours, erreurs }) {
  const navigate = useNavigate();
  const [montant, setMontant] = useState('');
  const [methode, setMethode] = useState('MTN_MOBILE_MONEY');
  const [numero, setNumero] = useState('');
  const [erreursChamps, setErreursChamps] = useState({});
  const { t } = useTranslation('tableau-de-bord');

  // Commission calculée en direct sous le montant (même calcul que le backend).
  const taux = useTauxCommission();
  const montantSaisi = Number(montant);
  const apercu =
    taux !== null && Number.isInteger(montantSaisi) && montantSaisi >= 100 ? calculerCommission(montantSaisi, taux) : null;

  const collecte = Number(cagnotte.montant_collecte);
  const disponible = Number(cagnotte.montant_disponible ?? 0);
  const engage = collecte - disponible;

  function demanderRetrait(e) {
    e.preventDefault();
    const numeroNormalise = normaliserNumero(numero);
    const nouvellesErreurs = {};
    if (!(Number(montant) >= 100)) nouvellesErreurs.montant = t('retraits.montantMinimum', { montant: formaterMontant(100) });
    else if (Number(montant) > disponible) nouvellesErreurs.montant = t('retraits.montantDepasse', { disponible: formaterMontant(disponible) });
    if (!numeroNormalise) nouvellesErreurs.numero = messageNumeroInvalide();
    setErreursChamps(nouvellesErreurs);
    if (Object.keys(nouvellesErreurs).length > 0) return;

    return executer('retrait', async () => {
      await api.post('/retraits', {
        id_cagnotte: cagnotte.id_cagnotte,
        montant: Number(montant),
        methode_retrait: methode,
        numero_beneficiaire: numeroNormalise,
      });
      setMontant('');
      setNumero('');
      charger();
    });
  }

  function annulerCagnotte() {
    if (!window.confirm(t('retraits.annulerConfirmation'))) return;
    return executer('suppression', async () => {
      await api.delete(`/cagnottes/${cagnotte.id_cagnotte}`);
      navigate('/mes-cagnottes');
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-[28px] border border-border bg-card p-6 sm:p-7">
        <p className="text-sm font-medium text-muted-foreground">{t('retraits.disponible')}</p>
        <p className="mt-2 font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-primary">
          {formaterMontant(disponible, cagnotte.devise)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('retraits.resume', { collecte: formaterMontant(collecte, cagnotte.devise), engage: formaterMontant(engage, cagnotte.devise) })}
        </p>

        <hr className="my-6" />

        <form onSubmit={demanderRetrait} noValidate className="flex flex-col gap-5">
          <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">{t('retraits.demander')}</h2>
          <div>
            <label htmlFor="retrait-montant" className={libelle}>{t('retraits.montant')}</label>
            <input
              id="retrait-montant"
              type="number"
              inputMode="numeric"
              min={100}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              aria-invalid={!!erreursChamps.montant}
              className={champPilule}
            />
            {erreursChamps.montant && <p className={`mt-1.5 ${erreurTexte}`}>{erreursChamps.montant}</p>}
            {apercu && (
              <div className="mt-3" aria-live="polite">
                <p className="text-sm text-muted-foreground">
                  {t('retraits.commission', { taux: formaterTaux(taux), montant: formaterMontant(apercu.commission, cagnotte.devise) })}
                </p>
                <p className="mt-0.5 font-bold text-foreground">{t('retraits.vousRecevrez', { montant: formaterMontant(apercu.net, cagnotte.devise) })}</p>
              </div>
            )}
          </div>
          <ChoixOperateur libelle={t('retraits.recevoirSur')} valeur={methode} onChanger={setMethode} />
          <div>
            <label htmlFor="retrait-numero" className={libelle}>{t('retraits.numero')}</label>
            <input
              id="retrait-numero"
              type="tel"
              inputMode="tel"
              placeholder="6XX XX XX XX"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              aria-invalid={!!erreursChamps.numero}
              className={champPilule}
            />
            {erreursChamps.numero && <p className={`mt-1.5 ${erreurTexte}`}>{erreursChamps.numero}</p>}
          </div>
          <div>
            <Button type="submit" disabled={enCours.retrait} className="w-full">
              {enCours.retrait ? t('commun:actions.envoiEnCours') : t('retraits.bouton')}
            </Button>
            {erreurs.retrait && <p className={`mt-2 ${erreurTexte}`}>{erreurs.retrait}</p>}
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {t('retraits.verification')}
            </p>
          </div>
        </form>
      </section>

      <div className="flex flex-col gap-6">
        <section className="rounded-[28px] border border-border bg-card p-6 sm:p-7">
          <h2 className={titreSection}>{t('retraits.historique')}</h2>
          {retraits.length === 0 ? (
            <p className="mt-4 text-base text-muted-foreground">{t('retraits.aucun')}</p>
          ) : (
            <ul className="m-0 mt-5 flex list-none flex-col divide-y divide-border p-0">
              {retraits.map((r) => {
                return (
                  <li key={r.id_retrait} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">{formaterMontant(r.montant_brut, cagnotte.devise)}</p>
                        <p className="text-sm text-[#45524F]">
                          {Number(r.montant_commission) > 0
                            ? t('retraits.ligneCommission', { taux: formaterTaux(r.taux_commission), montant: formaterMontant(r.montant_commission, cagnotte.devise) })
                            : t('retraits.sansCommission')}
                          <strong className="text-foreground">{t('retraits.netVerse', { montant: formaterMontant(r.montant_net, cagnotte.devise) })}</strong>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formaterDate(r.date_creation)} · {nomOperateur(r.methode_retrait)} · {r.numero_beneficiaire}
                        </p>
                      </div>
                      <BadgeStatut statuts={statutsRetrait} statut={r.statut} />
                    </div>
                    {r.motif_rejet && <p className="mt-1.5 text-sm text-destructive">{t('retraits.motifRejet', { motif: r.motif_rejet })}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[28px] border-2 border-dashed border-destructive/30 p-6 sm:p-7">
          <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">{t('retraits.annulerTitre')}</h2>
          <p className="mt-2 text-[15px] leading-[1.6] text-[#45524F]">
            {t('retraits.annulerTexte')}
          </p>
          <Button
            variant="danger"
            onClick={annulerCagnotte}
            disabled={enCours.suppression || cagnotte.statut === 'ANNULEE'}
            className="mt-5"
          >
            {enCours.suppression ? t('retraits.annulation') : cagnotte.statut === 'ANNULEE' ? t('retraits.dejaAnnulee') : t('retraits.annulerTitre')}
          </Button>
          {erreurs.suppression && <p className={`mt-2 ${erreurTexte}`}>{erreurs.suppression}</p>}
        </section>
      </div>
    </div>
  );
}
