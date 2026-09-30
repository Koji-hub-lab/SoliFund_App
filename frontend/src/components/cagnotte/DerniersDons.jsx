import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '../ui/Button';
import PastilleInitiale from './PastilleInitiale';
import { formaterDateRelative, formaterMontant } from '../../utils/format';
import { erreurTexte, lienCharte } from './classes';

// Les 3 derniers dons ; « Voir tous les dons » déplie la liste paginée.
export default function DerniersDons({ dons, infos, onVoirPlus, enCours, erreur }) {
  const [deplie, setDeplie] = useState(false);
  const { t } = useTranslation('cagnotte');
  const affiches = deplie ? dons : dons.slice(0, 3);

  return (
    <div className="rounded-[28px] border border-border bg-card p-6">
      <h2 className="m-0 font-display text-xl font-bold text-foreground">{t('dons.titre')}</h2>

      {dons.length === 0 ? (
        <p className="mt-4 text-base text-muted-foreground">{t('dons.vide')}</p>
      ) : (
        <ul className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
          {affiches.map((d) => (
            <li key={d.id_don} className="flex items-center gap-3">
              <PastilleInitiale prenom={d.donateur.prenom} taille="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-foreground">{d.donateur.prenom || t('dons.anonyme')}</p>
                <p className="text-sm text-muted-foreground">{formaterDateRelative(d.date_creation)}</p>
              </div>
              <span className="shrink-0 font-bold text-primary">{formaterMontant(d.montant, d.devise)}</span>
            </li>
          ))}
        </ul>
      )}

      {deplie && infos.page < infos.pages && (
        <Button variant="outline" onClick={onVoirPlus} className="mt-5 w-full" disabled={enCours}>
          {enCours ? t('commun:chargementPoints') : t('dons.voirPlus')}
        </Button>
      )}
      {erreur && <p className={`mt-2 ${erreurTexte}`}>{erreur}</p>}

      {infos.total > 3 && (
        <button type="button" onClick={() => setDeplie((v) => !v)} className={`mt-5 ${lienCharte}`}>
          {deplie ? t('dons.moins') : t('dons.tous', { total: infos.total })}
        </button>
      )}
    </div>
  );
}
