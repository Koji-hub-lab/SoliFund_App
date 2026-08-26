import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';

export default function ModifierCagnotte() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

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
    setErreur('');
    try {
      await api.patch(`/cagnottes/${id}`, { ...form, objectif: Number(form.objectif) });
      navigate(`/cagnottes/${id}`);
    } catch (err) {
      setErreur(err.messageAffichable);
    }
  }

  if (!form) return <div className="conteneur"><Spinner /></div>;

  return (
    <div className="conteneur" style={{ maxWidth: 500 }}>
      <div className="carte">
        <h2>Modifier la cagnotte</h2>
        <form onSubmit={handleSubmit}>
          <input name="titre" value={form.titre} onChange={handleChange} required />
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} />
          <input name="objectif" type="number" value={form.objectif} onChange={handleChange} required />
          <label>Date de début</label>
          <input name="date_debut" type="date" value={form.date_debut} onChange={handleChange} required />
          <label>Date de fin</label>
          <input name="date_fin" type="date" value={form.date_fin} onChange={handleChange} required />
          <button type="submit">Enregistrer</button>
        </form>
        {erreur && <p className="erreur">{erreur}</p>}
      </div>
    </div>
  );
}