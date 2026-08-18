import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Inscription() {
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', mot_de_passe: '' });
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api.post('/utilisateurs/inscription', form);
      navigate('/login');
    } catch (err) {
      setErreur(err.response?.data?.message?.toString() || "Erreur d'inscription");
    }
  }

  return (
    <div className="conteneur" style={{ maxWidth: 400 }}>
      <div className="carte">
        <h2>Inscription</h2>
        <form onSubmit={handleSubmit}>
          <input name="nom" placeholder="Nom" onChange={handleChange} required />
          <input name="prenom" placeholder="Prénom" onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input name="mot_de_passe" type="password" placeholder="Mot de passe (8 caractères min)" onChange={handleChange} required />
          <button type="submit">S'inscrire</button>
        </form>
        {erreur && <p className="erreur">{erreur}</p>}
      </div>
    </div>
  );
}