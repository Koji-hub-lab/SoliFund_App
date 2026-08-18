import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Compte() {
  const { utilisateur } = useAuth();
  const [mesCagnottes, setMesCagnottes] = useState([]);

  useEffect(() => {
    if (!utilisateur) return;
    api.get('/cagnottes').then((res) => {
      setMesCagnottes(res.data.filter((c) => c.id_utilisateur === utilisateur.id_utilisateur));
    });
  }, [utilisateur]);

  if (!utilisateur) return <div className="conteneur"><p>Connecte-toi pour voir ton compte.</p></div>;

  const totalCollecte = mesCagnottes.reduce((acc, c) => acc + Number(c.montant_collecte), 0);

  return (
    <div className="conteneur">
      <h2>Mon compte</h2>
      <div className="carte">
        <p><strong>{utilisateur.prenom} {utilisateur.nom}</strong></p>
        <p style={{ color: 'var(--texte-clair)' }}>{utilisateur.email}</p>

        <div className="stat-bloc">
          <div>
            <div className="stat-chiffre">{mesCagnottes.length}</div>
            <div className="stat-label">Cagnotte{mesCagnottes.length > 1 ? 's' : ''} créée{mesCagnottes.length > 1 ? 's' : ''}</div>
          </div>
          <div>
            <div className="stat-chiffre">{totalCollecte.toLocaleString('fr-FR')}</div>
            <div className="stat-label">XAF collectés au total</div>
          </div>
        </div>
      </div>
    </div>
  );
}