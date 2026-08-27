import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../api/axios';
import { formaterDateHeure } from '../utils/format';

const icones = {
  DON: '💰',
  RETRAIT: '🏦',
  COMMENTAIRE: '💬',
  SYSTEME: '🔔',
  VERIFICATION: '✅',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);

  function charger() {
    api.get('/notifications')
      .then((res) => setNotifications(res.data))
      .finally(() => setChargement(false));
  }

  useEffect(charger, []);

  async function marquerLue(idNotification) {
    await api.patch(`/notifications/${idNotification}/lue`);
    charger();
  }

  async function toutMarquerLu() {
    const nonLues = notifications.filter((r) => r.statut === 'NON_LUE');
    await Promise.all(nonLues.map((r) => api.patch(`/notifications/${r.id_notification}/lue`)));
    charger();
  }

  const nbNonLues = notifications.filter((r) => r.statut === 'NON_LUE').length;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="mt-1 text-muted-foreground">
              {nbNonLues > 0 ? `${nbNonLues} notification${nbNonLues > 1 ? 's' : ''} non lue${nbNonLues > 1 ? 's' : ''}` : 'Tu es à jour.'}
            </p>
          </div>
          {nbNonLues > 0 && (
            <button onClick={toutMarquerLu} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
              <CheckCheck className="size-4" />
              Tout marquer comme lu
            </button>
          )}
        </div>

        {chargement && <p className="mt-6 text-muted-foreground">Chargement...</p>}

        {!chargement && notifications.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Bell className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune notification pour l'instant.</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {notifications.map((r) => (
            <div
              key={r.id_notification}
              className={`rounded-xl border p-4 ${r.statut === 'NON_LUE' ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{icones[r.notification.type] || '🔔'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{r.notification.titre}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.notification.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-xs text-muted-foreground">{formaterDateHeure(r.notification.date_envoi)}</span>
                    {r.notification.id_cagnotte && (
                      <Link to={`/cagnottes/${r.notification.id_cagnotte}`} className="text-xs font-medium text-primary hover:underline">
                        Voir la cagnotte
                      </Link>
                    )}
                    {r.statut === 'NON_LUE' && (
                      <button onClick={() => marquerLue(r.id_notification)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                        Marquer comme lue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}