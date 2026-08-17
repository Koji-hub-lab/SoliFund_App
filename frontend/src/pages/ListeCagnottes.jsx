import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ListeCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);
  const { utilisateur, deconnecter } = useAuth();

  useEffect(() => {
    api.get('/cagnottes').then((res) => setCagnottes(res.data));
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: '40px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Cagnottes</h2>
        {utilisateur ? (
          <div>
            <span>Bonjour {utilisateur.prenom} </span>
            <button onClick={deconnecter}>Déconnexion</button>
          </div>
        ) : (
          <Link to="/login">Connexion</Link>
        )}
      </div>
      {cagnottes.map((c) => (
        <div key={c.id_cagnotte} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8 }}>
          <h3><Link to={`/cagnottes/${c.id_cagnotte}`}>{c.titre}</Link></h3>
          <p>{c.montant_collecte} / {c.objectif} {c.devise}</p>
        </div>
      ))}
    </div>
  );
}