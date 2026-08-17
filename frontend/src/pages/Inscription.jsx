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
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2>Inscription</h2>
      <form onSubmit={handleSubmit}>
        <input name="nom" placeholder="Nom" onChange={handleChange} required /><br />
        <input name="prenom" placeholder="Prénom" onChange={handleChange} required /><br />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required /><br />
        <input name="mot_de_passe" type="password" placeholder="Mot de passe (8 caractères min)" onChange={handleChange} required /><br />
        <button type="submit">S'inscrire</button>
      </form>
      {erreur && <p style={{ color: 'red' }}>{erreur}</p>}
    </div>
  );
}