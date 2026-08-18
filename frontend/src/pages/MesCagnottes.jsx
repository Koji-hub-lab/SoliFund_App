import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function MesCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);
  const { utilisateur } = useAuth();

  useEffect(() => {
    api.get('/cagnottes').then((res) => {
      setCagnottes(res.data.filter((c) => c.id_utilisateur === utilisateur.id_utilisateur));
    });
  }, [utilisateur]);

  return (
    <div className="conteneur">
      <h2>Mes cagnottes</h2>
      <Link to="/creer-cagnotte">+ Créer une cagnotte</Link>
      {cagnottes.map((c) => (
        <div key={c.id_cagnotte} className="carte" style={{ marginTop: 12 }}>
          <h3><Link to={`/cagnottes/${c.id_cagnotte}`}>{c.titre}</Link></h3>
          <p>{c.montant_collecte} / {c.objectif} {c.devise} — <span className="badge">{c.statut}</span></p>
        </div>
      ))}
      {cagnottes.length === 0 && <p>Tu n'as pas encore de cagnotte.</p>}
    </div>
  );
}