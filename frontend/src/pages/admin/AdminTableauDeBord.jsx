import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { EnTeteAdmin } from '../../components/admin/ElementsAdmin';
import CarteChiffre from '../../components/ui/CarteChiffre';
import api from '../../api/axios';
import { formaterMontant } from '../../utils/format';
import { SqueletteChiffres } from '../../components/ui/Squelette';

export default function AdminTableauDeBord() {
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
        <EnTeteAdmin titre="Tableau de bord" sousTitre="Vue d'ensemble de l'activité sur Solifund." />

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {chargement && <SqueletteChiffres />}

        {stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_0.85fr_1.1fr_1.1fr]">
              <CarteChiffre libelle="Montant collecté" valeur={formaterMontant(stats.montant_total_collecte)} teinte="lagune" />
              <CarteChiffre libelle="Utilisateurs" valeur={stats.nb_utilisateurs} />
              <CarteChiffre libelle="Montant retiré" valeur={formaterMontant(stats.montant_total_retire)} valeurEnLagune />
              <CarteChiffre libelle="Retraits en attente" valeur={enAttente} teinte={enAttente > 0 ? 'ambre' : 'blanche'}>
                {enAttente > 0 && (
                  <Link to="/admin/retraits" className="inline-flex min-h-11 items-center text-sm font-bold text-[#7A5312] underline decoration-2 underline-offset-[5px]">
                    Traiter →
                  </Link>
                )}
              </CarteChiffre>
            </div>

            <section>
              <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">Cagnottes par statut</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CarteChiffre libelle="Actives" valeur={stats.cagnottes_par_statut.ACTIVE} />
                <CarteChiffre libelle="Suspendues" valeur={stats.cagnottes_par_statut.SUSPENDUE} />
                <CarteChiffre libelle="Terminées" valeur={stats.cagnottes_par_statut.TERMINEE} />
                <CarteChiffre libelle="Annulées" valeur={stats.cagnottes_par_statut.ANNULEE} />
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
