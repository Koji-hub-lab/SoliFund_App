import BarreProgression from '../BarreProgression';
import { formaterMontant } from '../../utils/format';
import { nbJoursRestants, pourcentageAtteint } from '../../utils/cagnotte';

function Case({ valeur, libelle, enAvant = false }) {
  return (
    <div className="rounded-[18px] bg-background px-2 py-3 text-center">
      <p className={`font-display text-xl font-bold leading-tight ${enAvant ? 'text-primary' : 'text-foreground'}`}>{valeur}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{libelle}</p>
    </div>
  );
}

// Carte de droite : chiffres de la collecte ; le formulaire de don est passé en enfant.
export default function CarteMontant({ cagnotte, children }) {
  const pourcentage = pourcentageAtteint(cagnotte);
  const jours = nbJoursRestants(cagnotte.date_fin);
  const nbDonateurs = cagnotte.nb_donateurs ?? 0;

  return (
    <div className="rounded-[32px] border border-border bg-card p-6 sm:p-7">
      <p className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
        {formaterMontant(cagnotte.montant_collecte, cagnotte.devise)}
      </p>
      <p className="mt-2 text-base text-muted-foreground">
        collectés sur un objectif de {formaterMontant(cagnotte.objectif, cagnotte.devise)}
      </p>

      <BarreProgression pourcentage={pourcentage} hauteur="h-3" className="mt-5" />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Case valeur={`${pourcentage} %`} libelle="atteint" enAvant />
        <Case valeur={nbDonateurs} libelle={nbDonateurs > 1 ? 'donateurs' : 'donateur'} />
        {jours < 0 ? (
          <Case valeur="—" libelle="terminée" />
        ) : (
          <Case valeur={jours} libelle={jours > 1 ? 'jours restants' : 'jour restant'} />
        )}
      </div>

      <hr className="my-6 border-border" />

      {children}
    </div>
  );
}
