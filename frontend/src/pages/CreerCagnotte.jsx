import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurServeur('');
    const erreurs = validerForm(form);
    setErreursChamps(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    try {
      const res = await api.post('/cagnottes', {
        ...form,
        objectif: Number(form.objectif),
        id_categorie: form.id_categorie ? Number(form.id_categorie) : undefined,
      });
      navigate(`/cagnottes/${res.data.id_cagnotte}`);
    } catch (err) {
      setErreurServeur(err.messageAffichable);
    }
  }

  return (
    <div className="conteneur" style={{ maxWidth: 500 }}>
      <div className="carte">
        <h2>Créer une cagnotte</h2>
        <form onSubmit={handleSubmit} noValidate>
          <input name="titre" placeholder="Titre" value={form.titre} onChange={handleChange} />
          {erreursChamps.titre && <p className="erreur">{erreursChamps.titre}</p>}

          <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} rows={4} />

          <input name="objectif" type="number" placeholder="Objectif (XAF)" value={form.objectif} onChange={handleChange} />
          {erreursChamps.objectif && <p className="erreur">{erreursChamps.objectif}</p>}

          <select name="id_categorie" value={form.id_categorie} onChange={handleChange}>
            <option value="">Choisir une catégorie (facultatif)</option>
            {categories.map((cat) => (
              <option key={cat.id_categorie} value={cat.id_categorie}>{cat.nom}</option>
            ))}
          </select>

          <label>Date de début</label>
          <input name="date_debut" type="date" value={form.date_debut} onChange={handleChange} />
          {erreursChamps.date_debut && <p className="erreur">{erreursChamps.date_debut}</p>}

          <label>Date de fin</label>
          <input name="date_fin" type="date" value={form.date_fin} onChange={handleChange} />
          {erreursChamps.date_fin && <p className="erreur">{erreursChamps.date_fin}</p>}

          <button type="submit">Créer la cagnotte</button>
        </form>
        {erreurServeur && <p className="erreur">{erreurServeur}</p>}
      </div>
    </div>
  );
}