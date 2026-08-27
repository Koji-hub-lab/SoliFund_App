import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus } from 'lucide-react';
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

export default function CreerCagnotte() {
  const [form, setForm] = useState({
    titre: '', description: '', objectif: '', date_debut: '', date_fin: '', id_categorie: '',
  });
  const [categories, setCategories] = useState([]);
  const [fichierImage, setFichierImage] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleImage(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    setFichierImage(fichier);
    setApercu(URL.createObjectURL(fichier));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurServeur('');
    const erreurs = validerForm(form);
    setErreursChamps(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    setEnvoiEnCours(true);
    try {
      const res = await api.post('/cagnottes', {
        ...form,
        objectif: Number(form.objectif),
        id_categorie: form.id_categorie ? Number(form.id_categorie) : undefined,
      });

      if (fichierImage) {
        const formData = new FormData();
        formData.append('image', fichierImage);
        await api.post(`/cagnottes/${res.data.id_cagnotte}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/cagnottes/${res.data.id_cagnotte}`);
    } catch (err) {
      setErreurServeur(err.messageAffichable);
      setEnvoiEnCours(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Créer une cagnotte</h1>
        <p className="mt-1 text-muted-foreground">Renseigne les informations de ton projet pour lancer ta collecte.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
          {/* Image */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Photo de couverture</label>
            <label
              htmlFor="image-cagnotte"
              className="flex aspect-[16/7] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              {apercu ? (
                <img src={apercu} alt="Aperçu" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="size-8" />
                  <span className="text-sm font-medium">Ajouter une photo (facultatif)</span>
                </>
              )}
            </label>
            <input id="image-cagnotte" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImage} className="hidden" />
          </div>

          <div>
            <label htmlFor="titre" className="mb-2 block text-sm font-medium text-foreground">Titre de la cagnotte</label>
            <input id="titre" name="titre" value={form.titre} onChange={handleChange} placeholder="Ex : Aide pour l'opération de Marie" className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            {erreursChamps.titre && <p className="mt-1 text-xs text-destructive">{erreursChamps.titre}</p>}
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-foreground">Description</label>
            <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Explique le contexte de ta cagnotte..." className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="objectif" className="mb-2 block text-sm font-medium text-foreground">Objectif (XAF)</label>
              <input id="objectif" name="objectif" type="number" value={form.objectif} onChange={handleChange} placeholder="500000" className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              {erreursChamps.objectif && <p className="mt-1 text-xs text-destructive">{erreursChamps.objectif}</p>}
            </div>
            <div>
              <label htmlFor="id_categorie" className="mb-2 block text-sm font-medium text-foreground">Catégorie</label>
              <select id="id_categorie" name="id_categorie" value={form.id_categorie} onChange={handleChange} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="">Aucune catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id_categorie} value={cat.id_categorie}>{cat.nom}</option>
                ))}
              </select>
            </div>
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

          <Button type="submit" size="lg" disabled={envoiEnCours} className="mt-2">
            {envoiEnCours ? 'Création en cours...' : 'Créer ma cagnotte'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}