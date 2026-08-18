import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function joursRestants(dateFin) {
  const diff = new Date(dateFin) - new Date();
  const jours = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (jours < 0) return 'Terminée';
  if (jours === 0) return 'Dernier jour';
  return `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`;
}

export default function DetailCagnotte() {
  const { id } = useParams();
  const [cagnotte, setCagnotte] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [actualites, setActualites] = useState([]);
  const [montant, setMontant] = useState('');
  const [numero, setNumero] = useState('');
  const [methode, setMethode] = useState('MTN_MOBILE_MONEY');
  const [message, setMessage] = useState('');
  const [nouvelleActualite, setNouvelleActualite] = useState({ titre: '', contenu: '' });
  const { utilisateur } = useAuth();

  function charger() {
    api.get(`/cagnottes/${id}`).then((res) => setCagnotte(res.data));
    api.get(`/commentaires/cagnotte/${id}`).then((res) => setCommentaires(res.data));
    api.get(`/actualites/cagnotte/${id}`).then((res) => setActualites(res.data));
  }

  useEffect(charger, [id]);

  async function faireDon(e) {
    e.preventDefault();
    const res = await api.post('/dons', {
      id_cagnotte: Number(id),
      montant: Number(montant),
      methode_paiement: methode,
      numero_payeur: numero,
    });
    await api.post(`/dons/${res.data.id_don}/valider`);
    setMontant('');
    setNumero('');
    setMessage('Merci pour ton don !');
    charger();
  }

  async function publierActualite(e) {
    e.preventDefault();
    await api.post('/actualites', { id_cagnotte: Number(id), ...nouvelleActualite });
    setNouvelleActualite({ titre: '', contenu: '' });
    charger();
  }

  if (!cagnotte) return <div className="conteneur"><p>Chargement...</p></div>;

  const pourcentage = Math.min(100, Math.round((cagnotte.montant_collecte / cagnotte.objectif) * 100));
  const estProprietaire = utilisateur && utilisateur.id_utilisateur === cagnotte.id_utilisateur;

  return (
    <div className="conteneur">
      <h2>{cagnotte.titre}</h2>
      <p>{cagnotte.description}</p>

      <div className="carte">
        <p><strong>{cagnotte.montant_collecte} / {cagnotte.objectif} {cagnotte.devise}</strong></p>
        <div className="barre-progression">
          <div className="barre-progression-remplissage" style={{ width: `${pourcentage}%` }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="badge">{pourcentage}% atteint</span>
          <span style={{ fontSize: 13, color: 'var(--texte-clair)' }}>{joursRestants(cagnotte.date_fin)}</span>
        </div>
      </div>

      <div className="carte">
        {utilisateur ? (
          <form onSubmit={faireDon}>
            <h3>Faire un don</h3>
            <input type="number" placeholder="Montant" value={montant} onChange={(e) => setMontant(e.target.value)} required />
            <select value={methode} onChange={(e) => setMethode(e.target.value)}>
              <option value="MTN_MOBILE_MONEY">MTN Mobile Money</option>
              <option value="ORANGE_MONEY">Orange Money</option>
            </select>
            <input placeholder="Numéro payeur" value={numero} onChange={(e) => setNumero(e.target.value)} required />
            <button type="submit">Donner</button>
          </form>
        ) : (
          <p>Connecte-toi pour faire un don.</p>
        )}
        {message && <p className="succes-texte">{message}</p>}
      </div>

      <h3>Actualités</h3>
      {estProprietaire && (
        <div className="carte">
          <form onSubmit={publierActualite}>
            <input
              placeholder="Titre de l'actualité"
              value={nouvelleActualite.titre}
              onChange={(e) => setNouvelleActualite({ ...nouvelleActualite, titre: e.target.value })}
              required
            />
            <textarea
              placeholder="Contenu"
              rows={3}
              value={nouvelleActualite.contenu}
              onChange={(e) => setNouvelleActualite({ ...nouvelleActualite, contenu: e.target.value })}
              required
            />
            <button type="submit">Publier</button>
          </form>
        </div>
      )}
      {actualites.map((a) => (
        <div key={a.id_actualite} className="carte">
          <strong>{a.titre}</strong>
          <p>{a.contenu}</p>
          <small style={{ color: 'var(--texte-clair)' }}>
            {new Date(a.date_publication).toLocaleDateString('fr-FR')}
          </small>
        </div>
      ))}
      {actualites.length === 0 && <p>Aucune actualité pour l'instant.</p>}

      <h3>Commentaires</h3>
      {commentaires.map((c) => (
        <div key={c.id_commentaire} className="carte">
          <strong>{c.utilisateur.prenom} :</strong> {c.description}
        </div>
      ))}
      {commentaires.length === 0 && <p>Aucun commentaire pour l'instant.</p>}
    </div>
  );
}