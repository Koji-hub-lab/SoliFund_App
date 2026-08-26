import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreurChamp, setErreurChamp] = useState('');
  const [erreurServeur, setErreurServeur] = useState('');
  const { connecter } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurServeur('');
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErreurChamp('Email invalide.');
      return;
    }
    setErreurChamp('');

    try {
      const res = await api.post('/auth/login', { email, mot_de_passe: motDePasse });
      connecter(res.data.access_token, res.data.utilisateur);
      navigate('/');
    } catch (err) {
      setErreurServeur(err.messageAffichable);
    }
  }

  return (
    <div className="conteneur" style={{ maxWidth: 400 }}>
      <div className="carte">
        <h2>Connexion</h2>
        <form onSubmit={handleSubmit} noValidate>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {erreurChamp && <p className="erreur">{erreurChamp}</p>}
          <input type="password" placeholder="Mot de passe" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          <button type="submit">Se connecter</button>
        </form>
        {erreurServeur && <p className="erreur">{erreurServeur}</p>}
        <p>Pas de compte ? <Link to="/inscription">S'inscrire</Link></p>
      </div>
    </div>
  );
}