import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const { connecter } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    try {
      const res = await api.post('/auth/login', { email, mot_de_passe: motDePasse });
      connecter(res.data.access_token, res.data.utilisateur);
      navigate('/');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de connexion');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <br />
        <input type="password" placeholder="Mot de passe" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        <br />
        <button type="submit">Se connecter</button>
      </form>
      {erreur && <p style={{ color: 'red' }}>{erreur}</p>}
      <p>Pas de compte ? <Link to="/inscription">S'inscrire</Link></p>
    </div>
  );
}