import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import api from '../api/axios';

function validerForm(form) {
  const erreurs = {};
  if (!form.titre.trim()) erreurs.titre = 'Le titre est requis.';
  if (!form.objectif || Number(form.objectif) <= 0) erreurs.objectif = "L'objectif doit être supérieur à 0.";
  if (!form.date_debut) erreurs.date_debut = 'La date de début est requise.';
  if (!form.date_fin) erreurs.date_fin = 'La date de fin est requise.';
  if (form.date_debut && form.date_fin && form.date_fin <= form.date_debut) {
    erreurs.date_fin = 'La date de fin doit être après la date de début.';
  }
  return erreurs;
}

export default function ModifierCagnotte() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    api.get(`/cagnottes/${id}`).then((res) => {
      const c = res.data;
      setForm({
        titre: c.titre,
        description: c.description || '',
        objectif: c.objectif,
        date_debut: c.date_debut.slice(0, 10),
        date_fin: c.date_fin.slice(0, 10),
      });
    });
  }, [id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurServeur('');
    const erreurs = validerForm(form);
    setErreursChamps(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    setEnvoiEnCours(true);
    try {
      await api.patch(`/cagnottes/${id}`, { ...form, objectif: Number(form.objectif) });
      navigate(`/cagnottes/${id}`);
    } catch (err) {
      setErreurServeur(err.messageAffichable);
      setEnvoiEnCours(false);
    }
  }

  if (!form) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Modifier la cagnotte</h1>
        <p className="mt-1 text-muted-foreground">Mets à jour les informations de ta collecte.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
          <div>
            <label htmlFor="titre" className="mb-2 block text-sm font-medium text-foreground">Titre de la cagnotte</label>
            <input id="titre" name="titre" value={form.titre} onChange={handleChange} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            {erreursChamps.titre && <p className="mt-1 text-xs text-destructive">{erreursChamps.titre}</p>}
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-foreground">Description</label>
            <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          <div>
            <label htmlFor="objectif" className="mb-2 block text-sm font-medium text-foreground">Objectif (XAF)</label>
            <input id="objectif" name="objectif" type="number" value={form.objectif} onChange={handleChange} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            {erreursChamps.objectif && <p className="mt-1 text-xs text-destructive">{erreursChamps.objectif}</p>}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="date_debut" className="mb-2 block text-sm font-medium text-foreground">Date de début</label>
              <input id="date_debut" name="date_debut" type="date" value={form.date_debut} onChange={handleChange} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              {erreursChamps.date_debut && <p className="mt-1 text-xs text-destructive">{erreursChamps.date_debut}</p>}
            </div>
            <div>
              <label htmlFor="date_fin" className="mb-2 block text-sm font-medium text-foreground">Date de fin</label>
              <input id="date_fin" name="date_fin" type="date" value={form.date_fin} onChange={handleChange} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              {erreursChamps.date_fin && <p className="mt-1 text-xs text-destructive">{erreursChamps.date_fin}</p>}
            </div>
          </div>

          {erreurServeur && <p className="text-sm text-destructive">{erreurServeur}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={envoiEnCours}>{envoiEnCours ? 'Enregistrement...' : 'Enregistrer'}</Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/cagnottes/${id}`)}>Annuler</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}