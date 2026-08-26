import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_URL } from '../api/axios';
import Spinner from '../components/Spinner';
import MessageErreur from '../components/MessageErreur';

function joursRestants(dateFin) {
  const diff = new Date(dateFin) - new Date();
  const jours = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (jours < 0) return 'Terminée';
  if (jours === 0) return 'Dernier jour';
  return `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`;
}

export default function ListeCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [categorieChoisie, setCategorieChoisie] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  function charger() {
    setChargement(true);
    setErreur('');
    Promise.all([api.get('/cagnottes'), api.get('/categories')])
      .then(([resCagnottes, resCategories]) => {
        setCagnottes(resCagnottes.data);
        setCategories(resCategories.data);
      })
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(charger, []);

  function nomCategorie(idCategorie) {
    return categories.find((cat) => cat.id_categorie === idCategorie)?.nom;
  }

  const cagnottesFiltrees = cagnottes.filter((c) => {
    const correspondRecherche = c.titre.toLowerCase().includes(recherche.toLowerCase());
    const correspondCategorie = !categorieChoisie || c.id_categorie === Number(categorieChoisie);
    return correspondRecherche && correspondCategorie;
  });

  if (chargement) return <div className="conteneur"><Spinner /></div>;
  if (erreur) return <div className="conteneur"><MessageErreur texte={erreur} onReessayer={charger} /></div>;

  return (
    <div className="conteneur">
      <h2>Cagnottes</h2>

      <div className="carte" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Rechercher une cagnotte..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          style={{ flex: 2, marginBottom: 0 }}
        />
        <select
          value={categorieChoisie}
          onChange={(e) => setCategorieChoisie(e.target.value)}
          style={{ flex: 1, marginBottom: 0 }}
        >
          <option value="">Toutes catégories</option>
          {categories.map((cat) => (
            <option key={cat.id_categorie} value={cat.id_categorie}>{cat.nom}</option>
          ))}
        </select>
      </div>

      {cagnottesFiltrees.length === 0 && <p>Aucune cagnotte ne correspond à ta recherche.</p>}
      {cagnottesFiltrees.map((c) => {
        const pourcentage = Math.min(100, Math.round((c.montant_collecte / c.objectif) * 100));
        return (
          <div key={c.id_cagnotte} className="carte">
            {c.image && (
              <img src={`${API_URL}${c.image}`} alt={c.titre} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h3><Link to={`/cagnottes/${c.id_cagnotte}`}>{c.titre}</Link></h3>
              {c.id_categorie && <span className="badge">{nomCategorie(c.id_categorie)}</span>}
            </div>
            <p>{Number(c.montant_collecte).toLocaleString('fr-FR')} / {Number(c.objectif).toLocaleString('fr-FR')} {c.devise}</p>
            <div className="barre-progression">
              <div className="barre-progression-remplissage" style={{ width: `${pourcentage}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span className="badge">{pourcentage}% atteint</span>
              <span style={{ fontSize: 13, color: 'var(--texte-clair)' }}>{joursRestants(c.date_fin)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}