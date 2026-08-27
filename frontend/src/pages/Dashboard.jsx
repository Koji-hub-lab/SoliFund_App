import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../api/axios';
import { formaterMontant, formaterDateHeure } from '../utils/format';

export default function Dashboard() {
  const { utilisateur } = useAuth();
  const [mesCagnottes, setMesCagnottes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/cagnottes'), api.get('/notifications')])
      .then(([resCagnottes, resNotifs]) => {
        setMesCagnottes(resCagnottes.data.filter((c) => c.id_utilisateur === utilisateur.id_utilisateur));
        setNotifications(resNotifs.data);
      })
      .finally(() => setChargement(false));
  }, [utilisateur]);

  if (chargement) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Chargement...</p>
      </DashboardLayout>
    );
  }

  const totalCollecte = mesCagnottes.reduce((acc, c) => acc + Number(c.montant_collecte), 0);
  const nbActives = mesCagnottes.filter((c) => c.statut === 'ACTIVE').length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bonjour, {utilisateur.prenom} 👋</h1>
            <p className="mt-1 text-muted-foreground">Voici un aperçu de ton activité sur Solifund.</p>
          </div>
          <Button to="/creer-cagnotte">
            <PlusCircle className="size-4" />
            Créer une cagnotte
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Cagnottes actives</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{nbActives}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total collecté</p>
            <p className="mt-2 text-3xl font-bold text-primary">{formaterMontant(totalCollecte)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Cagnottes créées</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{mesCagnottes.length}</p>
          </div>
        </div>

        {/* Mes cagnottes récentes */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Mes cagnottes récentes</h2>
            <Link to="/mes-cagnottes" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Voir tout <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {mesCagnottes.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Tu n'as pas encore de cagnotte. Lance-toi !</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {mesCagnottes.slice(0, 3).map((c) => {
                const percent = Math.min(100, Math.round((c.montant_collecte / c.objectif) * 100));
                return (
                  <Link
                    key={c.id_cagnotte}
                    to={`/cagnottes/${c.id_cagnotte}`}
                    className="flex items-center gap-4 rounded-lg border border-border p-3 hover:bg-secondary"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {c.image && <img src={`${API_URL}${c.image}`} alt={c.titre} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{c.titre}</p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">{percent}%</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications récentes */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Notifications récentes</h2>
            <Link to="/notifications" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Voir tout <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {notifications.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Aucune notification pour l'instant.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {notifications.slice(0, 3).map((r) => (
                <div key={r.id_notification} className={`rounded-lg border p-3 ${r.statut === 'NON_LUE' ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                  <p className="font-medium text-foreground">{r.notification.titre}</p>
                  <p className="text-sm text-muted-foreground">{r.notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formaterDateHeure(r.notification.date_envoi)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}