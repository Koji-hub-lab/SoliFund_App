import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import ElementActivite from '../components/dashboard/ElementActivite';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../api/axios';
import { SqueletteListe } from '../components/ui/Squelette';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  // Action en cours ('tout' ou id de notification) et erreur associée ({ cible, message }).
  const [enCours, setEnCours] = useState(null);
  const [erreur, setErreur] = useState(null);

  function charger() {
    return api.get('/notifications')
      .then((res) => setNotifications(res.data))
      .catch((err) => setErreur({ cible: 'tout', message: err.messageAffichable }))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function executer(cible, action) {
    if (enCours) return;
    setEnCours(cible);
    setErreur(null);
    try {
      await action();
      await charger();
    } catch (err) {
      setErreur({ cible, message: err.messageAffichable });
    } finally {
      setEnCours(null);
    }
  }

  function marquerLue(idNotification) {
    return executer(idNotification, () => api.patch(`/notifications/${idNotification}/lue`));
  }

  function toutMarquerLu() {
    const nonLues = notifications.filter((r) => r.statut === 'NON_LUE');
    return executer('tout', () => Promise.all(nonLues.map((r) => api.patch(`/notifications/${r.id_notification}/lue`))));
  }

  const nbNonLues = notifications.filter((r) => r.statut === 'NON_LUE').length;

  const lien = 'inline-flex min-h-11 items-center text-sm font-bold text-primary underline decoration-2 underline-offset-[5px]';

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
              Notifications
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {nbNonLues > 0 ? `${nbNonLues} notification${nbNonLues > 1 ? 's' : ''} non lue${nbNonLues > 1 ? 's' : ''}` : 'Vous êtes à jour.'}
            </p>
          </div>
          {nbNonLues > 0 && (
            <Button variant="outline" onClick={toutMarquerLu} disabled={enCours !== null} className="shrink-0">
              <CheckCheck className="size-5" />
              {enCours === 'tout' ? 'Enregistrement...' : 'Tout marquer comme lu'}
            </Button>
          )}
        </div>

        {erreur?.cible === 'tout' && <p className="text-sm text-destructive">{erreur.message}</p>}

        {chargement && <SqueletteListe lignes={4} />}

        {!chargement && (
          <section className="rounded-[28px] border border-border bg-card p-6 sm:p-7">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Bell className="size-8 text-muted-foreground" />
                <p className="text-base text-muted-foreground">Aucune notification pour le moment.</p>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
                {notifications.map((r) => {
                  const idCagnotte = r.notification.id_cagnotte;
                  const versGestion = idCagnotte && ['DON', 'RETRAIT'].includes(r.notification.type);
                  const versCommentaires = r.notification.type === 'COMMENTAIRE';
                  return (
                    <ElementActivite key={r.id_notification} recu={r} className="py-5 first:pt-0 last:pb-0">
                        {(idCagnotte || r.statut === 'NON_LUE') && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                            {idCagnotte && (
                              <Link
                                to={versGestion
                                  ? `/mes-cagnottes/${idCagnotte}${r.notification.type === 'RETRAIT' ? '?onglet=retraits' : ''}`
                                  : `/cagnottes/${idCagnotte}${versCommentaires ? '?onglet=commentaires' : ''}`}
                                className={lien}
                              >
                                {versGestion ? 'Gérer la cagnotte' : versCommentaires ? 'Voir le commentaire' : 'Voir la cagnotte'}
                              </Link>
                            )}
                            {r.statut === 'NON_LUE' && (
                              <button
                                type="button"
                                onClick={() => marquerLue(r.id_notification)}
                                disabled={enCours !== null}
                                className="inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Marquer comme lue
                              </button>
                            )}
                          </div>
                        )}
                        {erreur?.cible === r.id_notification && <p className="mt-2 text-sm text-destructive">{erreur.message}</p>}
                    </ElementActivite>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
