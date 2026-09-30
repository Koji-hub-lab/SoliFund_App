import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { EnTeteAdmin } from '../../components/admin/ElementsAdmin';
import CarteChiffre from '../../components/ui/CarteChiffre';
import api from '../../api/axios';
import { formaterMontant } from '../../utils/format';
import { SqueletteChiffres } from '../../components/ui/Squelette';

export default function AdminTableauDeBord() {
  const { t } = useTranslation('admin');
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api.get('/admin/statistiques')
      .then((res) => setStats(res.data))
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }, []);

  const enAttente = stats?.nb_retraits_en_attente ?? 0;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-10">
        <EnTeteAdmin titre={t('tableau.titre')} sousTitre={t('tableau.sousTitre')} />

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {chargement && <SqueletteChiffres />}

        {stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="sm:col-span-2 xl:col-span-2">
                <CarteChiffre libelle={t('tableau.montantCollecte')} valeur={formaterMontant(stats.montant_total_collecte)} teinte="lagune" />
              </div>
              <CarteChiffre libelle={t('tableau.utilisateurs')} valeur={stats.nb_utilisateurs} />
              <CarteChiffre libelle={t('tableau.montantRetire')} valeur={formaterMontant(stats.montant_total_retire)} valeurEnLagune />
              <CarteChiffre libelle={t('tableau.commissionsDuMois')} valeur={formaterMontant(stats.commissions_du_mois ?? 0)} valeurEnLagune>
                <Link to="/admin/revenus" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline decoration-2 underline-offset-[5px]">
                  {t('tableau.voirRevenus')}
                </Link>
              </CarteChiffre>
              <CarteChiffre libelle={t('tableau.retraitsEnAttente')} valeur={enAttente} teinte={enAttente > 0 ? 'ambre' : 'blanche'}>
                {enAttente > 0 && (
                  <Link to="/admin/retraits" className="inline-flex min-h-11 items-center text-sm font-bold text-[#7A5312] underline decoration-2 underline-offset-[5px]">
                    {t('tableau.traiter')}
                  </Link>
                )}
              </CarteChiffre>
            </div>

            <section>
              <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">{t('tableau.parStatut')}</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CarteChiffre libelle={t('tableau.actives')} valeur={stats.cagnottes_par_statut.ACTIVE} />
                <CarteChiffre libelle={t('tableau.suspendues')} valeur={stats.cagnottes_par_statut.SUSPENDUE} />
                <CarteChiffre libelle={t('tableau.terminees')} valeur={stats.cagnottes_par_statut.TERMINEE} />
                <CarteChiffre libelle={t('tableau.annulees')} valeur={stats.cagnottes_par_statut.ANNULEE} />
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
