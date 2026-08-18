import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CreerCagnotte() {
  const [form, setForm] = useState({
    titre: '', description: '', objectif: '', date_debut: '', date_fin: '', id_categorie: '',
  });
  const [categories, setCategories] = useState([]);
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    try {
      const res = await api.post('/cagnottes', {
        ...form,
        objectif: Number(form.objectif),
        id_categorie: form.id_categorie ? Number(form.id_categorie) : undefined,
      });
      navigate(`/cagnottes/${res.data.id_cagnotte}`);
    } catch (err) {
      setErreur(err.response?.data?.message?.toString() || 'Erreur de création');
    }
  }

  return (
    <div className="conteneur" style={{ maxWidth: 500 }}>
      <div className="carte">
        <h2>Créer une cagnotte</h2>
        <form onSubmit={handleSubmit}>
          <input name="titre" placeholder="Titre" onChange={handleChange} required />
          <textarea name="description" placeholder="Description" onChange={handleChange} rows={4} />
          <input name="objectif" type="number" placeholder="Objectif (XAF)" onChange={handleChange} required />
          <select name="id_categorie" onChange={handleChange} defaultValue="">
            <option value="">Choisir une catégorie (facultatif)</option>
            {categories.map((cat) => (
              <option key={cat.id_categorie} value={cat.id_categorie}>{cat.nom}</option>
            ))}
          </select>
          <label>Date de début</label>
          <input name="date_debut" type="date" onChange={handleChange} required />
          <label>Date de fin</label>
          <input name="date_fin" type="date" onChange={handleChange} required />
          <button type="submit">Créer la cagnotte</button>
        </form>
        {erreur && <p className="erreur">{erreur}</p>}
      </div>
    </div>
  );
}