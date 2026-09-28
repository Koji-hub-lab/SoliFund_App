import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';
import { chargerToutesLesPages } from '../../api/pagination';
import { formaterMontant, formaterDateHeure } from '../../utils/format';
import { statutsRetrait } from '../../utils/statuts';

function IconeStatut({ statut }) {
  const Icone = statutsRetrait[statut]?.Icone;
  return Icone ? <Icone className="size-3" /> : null;
}

export default function AdminRetraits() {
  const [retraits, setRetraits] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('EN_ATTENTE');
  const [motifs, setMotifs] = useState({});
  // Retrait en cours de traitement et erreurs ({ chargement | id_retrait: message }).
  const [enCours, setEnCours] = useState(null);
  const [erreurs, setErreurs] = useState({});

  function charger() {
    setChargement(true);
    setErreurs((e) => ({ ...e, chargement: '' }));
    return chargerToutesLesPages('/retraits', filtre === 'TOUS' ? {} : { statut: filtre })
      .then((res) => setRetraits(res.donnees))
      .catch((err) => setErreurs((e) => ({ ...e, chargement: err.messageAffichable })))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, [filtre]);

  async function executer(id, action) {
    if (enCours) return;
    setEnCours(id);
    setErreurs((e) => ({ ...e, [id]: '' }));
    try {
      await action();
      await charger();
    } catch (err) {
      setErreurs((e) => ({ ...e, [id]: err.messageAffichable }));
    } finally {
      setEnCours(null);
    }
  }

  function approuver(id) {
    if (!window.confirm('Confirmer le traitement de ce retrait ?')) return;
    return executer(id, () => api.post(`/retraits/${id}/traiter`));
  }

  function rejeter(id) {
    return executer(id, () => api.post(`/retraits/${id}/rejeter`, { motif_rejet: motifs[id] || undefined }));
  }

  const retraitsFiltres = retraits;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des retraits</h1>
          <p className="mt-1 text-muted-foreground">Approuve ou rejette les demandes de retrait des organisateurs.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['EN_ATTENTE', 'TRAITE', 'REJETE', 'TOUS'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filtre === f ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'
              }`}
            >
              {f === 'TOUS' ? 'Tous' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {erreurs.chargement && <p className="text-sm text-destructive">{erreurs.chargement}</p>}

        {chargement && <p className="text-muted-foreground">Chargement...</p>}

        {!chargement && retraitsFiltres.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            Aucune demande dans cette catégorie.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {retraitsFiltres.map((r) => (
            <div key={r.id_retrait} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{r.cagnotte.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    Demandé par {r.utilisateur.prenom} {r.utilisateur.nom} ({r.utilisateur.email})
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.methode_retrait.replace('_', ' ')} — N° {r.numero_beneficiaire} — {formaterDateHeure(r.date_creation)}
                  </p>
                  {r.motif_rejet && <p className="mt-1 text-xs text-destructive">Motif du rejet : {r.motif_rejet}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{formaterMontant(r.montant, r.cagnotte.devise)}</p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statutsRetrait[r.statut]?.classes}`}>
                    <IconeStatut statut={r.statut} />
                    {r.statut.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {r.statut === 'EN_ATTENTE' && (
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
                  <input
                    placeholder="Motif de rejet (facultatif)"
                    value={motifs[r.id_retrait] || ''}
                    onChange={(e) => setMotifs({ ...motifs, [r.id_retrait]: e.target.value })}
                    className="h-10 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex gap-2">
                    <Button size="default" onClick={() => approuver(r.id_retrait)} className="gap-1.5" disabled={enCours !== null}>
                      <CheckCircle2 className="size-4" />
                      {enCours === r.id_retrait ? 'Envoi en cours...' : 'Approuver'}
                    </Button>
                    <Button
                      size="default"
                      variant="outline"
                      onClick={() => rejeter(r.id_retrait)}
                      disabled={enCours !== null}
                      className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="size-4" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              )}
              {erreurs[r.id_retrait] && <p className="mt-2 text-sm text-destructive">{erreurs[r.id_retrait]}</p>}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}