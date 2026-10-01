import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { BadgeStatut, statutsIdentite } from '../../utils/statuts';
import { lienVerification, useVerificationIdentite } from '../../utils/identite';

// Carte « Vérification d'identité » de la page Mon profil : statut et accès à la page dédiée.
export default function CarteVerification() {
  const { t } = useTranslation('identite');
  const { verification, erreur } = useVerificationIdentite();
  const statut = verification?.statut;
  const aSoumettre = !verification || statut === 'NON_SOUMISE' || statut === 'REFUSEE';

  return (
    <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-7">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-bold text-foreground">{t('carte.titre')}</h2>
          {statut && <BadgeStatut statuts={statutsIdentite} statut={statut} />}
        </div>
        <p className="mt-1.5 text-sm leading-[1.6] text-[#45524F]">
          {erreur
            ? t('requise.chargement', { detail: erreur })
            : statut
              ? t(`carte.${statut}`, { numero: `+237 ${verification.telephone_retrait ?? ''}` })
              : null}
        </p>
      </div>
      <Button to={lienVerification('/compte')} variant={aSoumettre ? 'default' : 'outline'} className="shrink-0">
        {aSoumettre ? t('carte.verifier') : t('carte.voir')}
      </Button>
    </section>
  );
}
