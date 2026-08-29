import { useEffect, useState } from 'react';
import { ShieldBan, ShieldCheck, ShieldAlert } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../api/axios';
import { formaterDate } from '../../utils/format';

const statutStyles = {
  ACTIF: 'bg-primary/10 text-primary',
  SUSPENDU: 'bg-accent/20 text-accent-foreground',
  BANNI: 'bg-destructive/10 text-destructive',
  INACTIF: 'bg-secondary text-muted-foreground',
};

export default function AdminUtilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);

  function charger() {
    setChargement(true);
    api.get('/utilisateurs').then((res) => setUtilisateurs(res.data)).finally(() => setChargement(false));
  }

  useEffect(charger, []);

  async function changerStatut(id, statut, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    await api.patch(`/utilisateurs/${id}/statut`, { statut });
    charger();
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="mt-1 text-muted-foreground">{utilisateurs.length} compte{utilisateurs.length > 1 ? 's' : ''} inscrit{utilisateurs.length > 1 ? 's' : ''} sur la plateforme.</p>
        </div>

        {chargement && <p className="text-muted-foreground">Chargement...</p>}

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Inscrit le</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.id_utilisateur} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{u.prenom} {u.nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formaterDate(u.date_inscription)}</td>
                  <td className="px-4 py-3">
                    {u.roles.includes('ROLE_ADMIN') ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Admin</span>
                    ) : (
                      <span className="text-muted-foreground">Utilisateur</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statutStyles[u.statut]}`}>{u.statut}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {u.statut !== 'ACTIF' && (
                        <button title="Réactiver" onClick={() => changerStatut(u.id_utilisateur, 'ACTIF')} className="rounded-lg p-1.5 text-primary hover:bg-primary/10">
                          <ShieldCheck className="size-4" />
                        </button>
                      )}
                      {u.statut !== 'SUSPENDU' && (
                        <button title="Suspendre" onClick={() => changerStatut(u.id_utilisateur, 'SUSPENDU', 'Suspendre ce compte ?')} className="rounded-lg p-1.5 text-accent-foreground hover:bg-accent/20">
                          <ShieldAlert className="size-4" />
                        </button>
                      )}
                      {u.statut !== 'BANNI' && (
                        <button title="Bannir" onClick={() => changerStatut(u.id_utilisateur, 'BANNI', 'Bannir définitivement ce compte ?')} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
                          <ShieldBan className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}