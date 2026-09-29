import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import Champ from '../components/ui/Champ';
import { SqueletteFormulaire } from '../components/ui/Squelette';
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
  const [erreurChargement, setErreurChargement] = useState('');

  // Le formulaire n'est affiché qu'une fois la cagnotte chargée : jamais de formulaire vide.
  function charger() {
    setErreurChargement('');
    api.get(`/cagnottes/${id}`)
      .then((res) => {
        const c = res.data;
        setForm({
          titre: c.titre,
          description: c.description || '',
          objectif: c.objectif,
          date_debut: c.date_debut.slice(0, 10),
          date_fin: c.date_fin.slice(0, 10),
        });
      })
      .catch((err) => setErreurChargement(err.messageAffichable));
  }

  useEffect(charger, [id]);

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

  const enTete = (
    <div>
      <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
        Modifier la cagnotte
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">Mettez à jour les informations de votre collecte.</p>
    </div>
  );

  if (!form) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {enTete}
          {erreurChargement ? (
            <div className="flex flex-col items-center gap-4 rounded-[32px] border border-border bg-card p-10 text-center">
              <p className="text-destructive">La cagnotte n'a pas pu être chargée. {erreurChargement}</p>
              <Button variant="outline" onClick={charger}>Réessayer</Button>
              <Link to="/mes-cagnottes" className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-2 underline-offset-[5px]">
                Retour à mes cagnottes
              </Link>
            </div>
          ) : (
            <SqueletteFormulaire champs={4} />
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {enTete}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <Champ id="titre" name="titre" libelle="Titre de la cagnotte" value={form.titre} onChange={handleChange} erreur={erreursChamps.titre} />
          <Champ as="textarea" id="description" name="description" libelle="Description" value={form.description} onChange={handleChange} rows={5} />
          <Champ id="objectif" name="objectif" type="number" libelle="Objectif (XAF)" value={form.objectif} onChange={handleChange} erreur={erreursChamps.objectif} />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="date_debut" name="date_debut" type="date" libelle="Date de début" value={form.date_debut} onChange={handleChange} erreur={erreursChamps.date_debut} />
            <Champ id="date_fin" name="date_fin" type="date" libelle="Date de fin" value={form.date_fin} onChange={handleChange} erreur={erreursChamps.date_fin} />
          </div>

          {erreurServeur && <p className="text-sm text-destructive">{erreurServeur}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="lg" disabled={envoiEnCours}>{envoiEnCours ? 'Enregistrement...' : 'Enregistrer'}</Button>
            <Button type="button" size="lg" variant="outline" onClick={() => navigate(`/cagnottes/${id}`)}>Annuler</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
