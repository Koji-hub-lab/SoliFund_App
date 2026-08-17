import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function DetailCagnotte() {
  const { id } = useParams();
  const [cagnotte, setCagnotte] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [montant, setMontant] = useState('');
  const [numero, setNumero] = useState('');
  const [methode, setMethode] = useState('MTN_MOBILE_MONEY');
  const [message, setMessage] = useState('');
  const { utilisateur } = useAuth();

  function charger() {
    api.get(`/cagnottes/${id}`).then((res) => setCagnotte(res.data));
    api.get(`/commentaires/cagnotte/${id}`).then((res) => setCommentaires(res.data));
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
    // Simule la confirmation immédiate du paiement (à remplacer par le vrai webhook plus tard)
    await api.post(`/dons/${res.data.id_don}/valider`);
    setMontant('');
    setNumero('');
    setMessage('Merci pour ton don !');
    charger();
  }

  if (!cagnotte) return <p>Chargement...</p>;

  return (
    <div style={{ maxWidth: 700, margin: '40px auto' }}>
      <h2>{cagnotte.titre}</h2>
      <p>{cagnotte.description}</p>
      <p><strong>{cagnotte.montant_collecte} / {cagnotte.objectif} {cagnotte.devise}</strong></p>

      {utilisateur ? (
        <form onSubmit={faireDon}>
          <h3>Faire un don</h3>
          <input type="number" placeholder="Montant" value={montant} onChange={(e) => setMontant(e.target.value)} required /><br />
          <select value={methode} onChange={(e) => setMethode(e.target.value)}>
            <option value="MTN_MOBILE_MONEY">MTN Mobile Money</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select><br />
          <input placeholder="Numéro payeur" value={numero} onChange={(e) => setNumero(e.target.value)} required /><br />
          <button type="submit">Donner</button>
        </form>
      ) : (
        <p>Connecte-toi pour faire un don.</p>
      )}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <h3>Commentaires</h3>
      {commentaires.map((c) => (
        <p key={c.id_commentaire}><strong>{c.utilisateur.prenom} :</strong> {c.description}</p>
      ))}
    </div>
  );
}