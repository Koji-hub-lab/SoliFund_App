import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, KeyRound } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import Champ, { classeChamp } from '../components/ui/Champ';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

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
  const [erreurCategories, setErreurCategories] = useState('');
  const [fichierImage, setFichierImage] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const navigate = useNavigate();
  const { utilisateur, connecter } = useAuth();

  // Compte non vérifié : saisie du code reçu par email avant de pouvoir créer une cagnotte.
  const [codeVerif, setCodeVerif] = useState('');
  const [erreurVerif, setErreurVerif] = useState('');
  const [messageVerif, setMessageVerif] = useState('');
  const [envoiVerif, setEnvoiVerif] = useState(false);

  async function verifierEmail(e) {
    e.preventDefault();
    setErreurVerif('');
    setMessageVerif('');
    setEnvoiVerif(true);
    try {
      await api.post('/auth/verifier-email', { email: utilisateur.email, code: codeVerif });
      connecter(localStorage.getItem('token'), { ...utilisateur, est_verifie: true });
    } catch (err) {
      setErreurVerif(err.messageAffichable);
    } finally {
      setEnvoiVerif(false);
    }
  }

  async function renvoyerCode() {
    setErreurVerif('');
    setMessageVerif('');
    setEnvoiVerif(true);
    try {
      await api.post('/auth/renvoyer-code-verification', { email: utilisateur.email });
      setMessageVerif('Nouveau code envoyé.');
    } catch (err) {
      setErreurVerif(err.messageAffichable);
    } finally {
      setEnvoiVerif(false);
    }
  }

  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => setErreurCategories(`Les catégories n'ont pas pu être chargées : vous pouvez créer la cagnotte sans catégorie. ${err.messageAffichable}`));
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
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
          Créer une cagnotte
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Renseignez les informations de votre projet pour lancer votre collecte.</p>

        {utilisateur?.est_verifie === false ? (
          <div className="mt-8 rounded-[32px] border border-border bg-card p-6 sm:p-8">
            <p className="text-base leading-[1.6] text-[#45524F]">
              Pour créer une cagnotte, vérifiez d'abord votre adresse email : saisissez le code à 6 chiffres reçu à <strong>{utilisateur.email}</strong>.
            </p>
            <form onSubmit={verifierEmail} className="mt-5 flex flex-col gap-4">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  required
                  aria-label="Code de vérification"
                  value={codeVerif}
                  onChange={(e) => setCodeVerif(e.target.value.replace(/\D/g, ''))}
                  className={`${classeChamp} h-[52px] pl-11 text-center text-lg font-bold tracking-[0.3em]`}
                />
              </div>
              {erreurVerif && <p className="text-sm text-destructive">{erreurVerif}</p>}
              {messageVerif && <p className="text-sm text-primary">{messageVerif}</p>}
              <Button type="submit" disabled={envoiVerif || codeVerif.length !== 6}>
                {envoiVerif ? 'Vérification...' : 'Vérifier le code'}
              </Button>
              <button type="button" onClick={renvoyerCode} disabled={envoiVerif} className="self-start inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-primary underline decoration-2 underline-offset-[5px] disabled:cursor-not-allowed disabled:opacity-60">
                Renvoyer le code
              </button>
            </form>
          </div>
        ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <div>
            <p className="mb-2 block text-sm font-bold text-foreground">Photo de couverture</p>
            <label
              htmlFor="image-cagnotte"
              className="flex aspect-[16/7] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[24px] border-2 border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {apercu ? (
                <img src={apercu} alt="Aperçu de la photo choisie" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="size-8" />
                  <span className="text-sm font-bold">Ajouter une photo (facultatif)</span>
                  <span className="text-xs">JPG, PNG ou WEBP, 5 Mo maximum</span>
                </>
              )}
            </label>
            <input id="image-cagnotte" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImage} className="sr-only" />
            {apercu && <p className="mt-1.5 text-sm text-muted-foreground">Cliquez sur la photo pour en choisir une autre.</p>}
          </div>

          <Champ id="titre" name="titre" libelle="Titre de la cagnotte" value={form.titre} onChange={handleChange} placeholder="Ex : Aide pour l'opération de Marie" erreur={erreursChamps.titre} />

          <Champ as="textarea" id="description" name="description" libelle="Description" value={form.description} onChange={handleChange} rows={5} placeholder="Expliquez le contexte de votre cagnotte..." />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="objectif" name="objectif" type="number" libelle="Objectif (XAF)" value={form.objectif} onChange={handleChange} placeholder="500000" erreur={erreursChamps.objectif} />
            <Champ as="select" id="id_categorie" name="id_categorie" libelle="Catégorie" value={form.id_categorie} onChange={handleChange} erreur={erreurCategories}>
              <option value="">Aucune catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id_categorie} value={cat.id_categorie}>{cat.nom}</option>
              ))}
            </Champ>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="date_debut" name="date_debut" type="date" libelle="Date de début" value={form.date_debut} onChange={handleChange} erreur={erreursChamps.date_debut} />
            <Champ id="date_fin" name="date_fin" type="date" libelle="Date de fin" value={form.date_fin} onChange={handleChange} erreur={erreursChamps.date_fin} />
          </div>

          {erreurServeur && <p className="text-sm text-destructive">{erreurServeur}</p>}

          <Button type="submit" size="lg" disabled={envoiEnCours} className="mt-2 sm:self-start">
            {envoiEnCours ? 'Création en cours...' : 'Créer ma cagnotte'}
          </Button>
        </form>
        )}
      </div>
    </DashboardLayout>
  );
}
