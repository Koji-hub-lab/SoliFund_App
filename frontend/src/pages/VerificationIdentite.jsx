import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Clock } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import { SqueletteFormulaire } from '../components/ui/Squelette';
import FormulaireVerification from '../components/identite/FormulaireVerification';
import { nomOperateur } from '../components/cagnotte/ChoixOperateur';
import { BadgeStatut, statutsIdentite } from '../utils/statuts';
import { formaterDate } from '../utils/format';
import { oublierVerification, retourSur, useVerificationIdentite } from '../utils/identite';

// Récapitulatif d'une vérification envoyée (en attente ou validée).
function Recapitulatif({ verification, t }) {
  const lignes = [
    [t('page.piece'), t(`formulaire.types.${verification.type_piece}`)],
    [t('page.numeroRetrait'), `${nomOperateur(verification.methode_retrait)} · +237 ${verification.telephone_retrait}`],
    [t('page.soumiseLe'), formaterDate(verification.date_soumission)],
  ];
  if (verification.statut === 'VALIDEE' && verification.date_decision) {
    lignes.push([t('page.valideeLe'), formaterDate(verification.date_decision)]);
  }
  return (
    <dl className="m-0 mt-6 grid grid-cols-1 gap-x-6 gap-y-2 rounded-[18px] bg-background px-5 py-4 text-sm sm:grid-cols-[max-content_1fr]">
      {lignes.map(([libelle, valeur]) => (
        <div key={libelle} className="contents">
          <dt className="font-bold text-foreground">{libelle}</dt>
          <dd className="m-0 text-[#45524F]">{valeur}</dd>
        </div>
      ))}
    </dl>
  );
}

// Vérification d'identité de l'organisateur : formulaire en 4 étapes (aucune soumission ou refus),
// examen en cours, ou identité vérifiée. ?retour=<page> : page où revenir après l'envoi (création de
// cagnotte, retrait).
export default function VerificationIdentite() {
  const { t } = useTranslation('identite');
  const navigate = useNavigate();
  const [parametres] = useSearchParams();
  const retour = retourSur(parametres.get('retour'));
  const { verification, erreur, recharger } = useVerificationIdentite();

  function apresEnvoi(resultat) {
    oublierVerification(resultat);
    if (retour) navigate(retour);
  }

  let contenu;
  if (erreur) {
    contenu = (
      <div className="mt-8 rounded-[32px] border border-border bg-card p-6 sm:p-8">
        <p className="text-sm text-destructive">{t('chargement', { detail: erreur })}</p>
        <Button variant="outline" onClick={recharger} className="mt-5">{t('reessayer')}</Button>
      </div>
    );
  } else if (!verification) {
    contenu = <div className="mt-8"><SqueletteFormulaire champs={4} /></div>;
  } else if (verification.statut === 'NON_SOUMISE' || verification.statut === 'REFUSEE') {
    contenu = (
      <FormulaireVerification
        key={verification.id_verification ?? 'nouvelle'}
        refus={verification.statut === 'REFUSEE' ? verification : null}
        onSoumise={apresEnvoi}
      />
    );
  } else {
    const validee = verification.statut === 'VALIDEE';
    const Icone = validee ? BadgeCheck : Clock;
    contenu = (
      <section className="mt-8 rounded-[32px] border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${validee ? 'bg-primary-soft text-primary' : 'bg-accent-soft text-[#7A5312]'}`}>
            <Icone className="size-6" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">
              {validee ? t('page.valideeTitre') : t('page.enAttenteTitre')}
            </h2>
            <p className="mt-2 text-base leading-[1.6] text-[#45524F]">
              {validee ? t('page.valideeTexte') : t('page.enAttenteTexte')}
            </p>
          </div>
        </div>
        <Recapitulatif verification={verification} t={t} />
        {validee && <p className="mt-4 text-sm text-muted-foreground">{t('page.changerNumero')}</p>}
        <Button to={retour ?? '/dashboard'} variant={retour ? 'default' : 'outline'} className="mt-6">
          {retour ? t('page.continuer') : t('page.retourTableau')}
        </Button>
      </section>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
            {t('page.titre')}
          </h1>
          {verification && <BadgeStatut statuts={statutsIdentite} statut={verification.statut} />}
        </div>
        <p className="mt-2 text-lg text-muted-foreground">{t('page.sousTitre')}</p>
        {contenu}
      </div>
    </DashboardLayout>
  );
}
