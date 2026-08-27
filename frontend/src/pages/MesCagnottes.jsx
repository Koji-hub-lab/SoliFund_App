import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../api/axios';
import { formaterMontant } from '../utils/format';

const statutStyles = {
  ACTIVE: 'bg-primary/10 text-primary',
  TERMINEE: 'bg-secondary text-muted-foreground',
  SUSPENDUE: 'bg-accent/20 text-accent-foreground',
  ANNULEE: 'bg-destructive/10 text-destructive',
};

export default function MesCagnottes() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const [cagnottes, setCagnottes] = useState([]);
  const [chargement, setChargement] = useState(true);

  function charger() {
    setChargement(true);
    api.get('/cagnottes')
      .then((res) => setCagnottes(res.data.filter((c) => c.id_utilisateur === utilisateur.id_utilisateur)))
      .finally(() => setChargement(false));
  }

  useEffect(charger, [utilisateur]);

  async function supprimer(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Supprimer définitivement cette cagnotte ? Cette action est irréversible.')) return;
    await api.delete(`/cagnottes/${id}`);
    charger();
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes cagnottes</h1>
            <p className="mt-1 text-muted-foreground">Gère toutes les cagnottes que tu as créées.</p>
          </div>
          <Button to="/creer-cagnotte">
            <PlusCircle className="size-4" />
            Créer une cagnotte
          </Button>
        </div>

        {chargement && <p className="text-muted-foreground">Chargement...</p>}

        {!chargement && cagnottes.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">Tu n'as pas encore créé de cagnotte.</p>
            <Button to="/creer-cagnotte" className="mt-4">
              <PlusCircle className="size-4" />
              Lancer ma première cagnotte
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cagnottes.map((c) => {
            const percent = Math.min(100, Math.round((c.montant_collecte / c.objectif) * 100));
            return (
              <div
                key={c.id_cagnotte}
                onClick={() => navigate(`/cagnottes/${c.id_cagnotte}`)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                  {c.image && (
                    <img src={`${API_URL}${c.image}`} alt={c.titre} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  )}
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${statutStyles[c.statut] || statutStyles.ACTIVE}`}>
                    {c.statut}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="truncate font-semibold text-foreground">{c.titre}</h3>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-foreground">{formaterMontant(c.montant_collecte, c.devise)}</span>
                    <span className="font-semibold text-primary">{percent}%</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      to={`/cagnottes/${c.id_cagnotte}/modifier`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      <Pencil className="size-3.5" />
                      Modifier
                    </Link>
                    <button
                      onClick={(e) => supprimer(e, c.id_cagnotte)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-transparent py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}