import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function validerForm(form) {
  const erreurs = {};
  if (!form.nom.trim()) erreurs.nom = 'Le nom est requis.';
  if (!form.prenom.trim()) erreurs.prenom = 'Le prénom est requis.';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) erreurs.email = 'Email invalide.';
  if (form.mot_de_passe.length < 8) erreurs.mot_de_passe = 'Le mot de passe doit contenir au moins 8 caractères.';
  return erreurs;
}

export default function Inscription() {
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', mot_de_passe: '' });
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const navigate = useNavigate();

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
      await api.post('/utilisateurs/inscription', form);
      navigate('/login');
    } catch (err) {
      setErreurServeur(err.messageAffichable);
    }
  }

  return (
    <div className="conteneur" style={{ maxWidth: 400 }}>
      <div className="carte">
        <h2>Inscription</h2>
        <form onSubmit={handleSubmit} noValidate>
          <input name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} />
          {erreursChamps.nom && <p className="erreur">{erreursChamps.nom}</p>}

          <input name="prenom" placeholder="Prénom" value={form.prenom} onChange={handleChange} />
          {erreursChamps.prenom && <p className="erreur">{erreursChamps.prenom}</p>}

          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} />
          {erreursChamps.email && <p className="erreur">{erreursChamps.email}</p>}

          <input name="mot_de_passe" type="password" placeholder="Mot de passe (8 caractères min)" value={form.mot_de_passe} onChange={handleChange} />
          {erreursChamps.mot_de_passe && <p className="erreur">{erreursChamps.mot_de_passe}</p>}

          <button type="submit">S'inscrire</button>
        </form>
        {erreurServeur && <p className="erreur">{erreurServeur}</p>}
      </div>
    </div>
  );
}