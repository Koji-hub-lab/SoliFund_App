import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api, { API_URL } from '../api/axios';
import Spinner from '../components/Spinner';
import MessageErreur from '../components/MessageErreur';
import { formaterMontant, formaterDate, formaterDateHeure } from '../utils/format';

function joursRestants(dateFin) {
  const diff = new Date(dateFin) - new Date();
  const jours = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (jours < 0) return 'Terminée';
  if (jours === 0) return 'Dernier jour';
  return `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`;
}

export default function DetailCagnotte() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cagnotte, setCagnotte] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [actualites, setActualites] = useState([]);
  const [retraits, setRetraits] = useState([]);
  const [montant, setMontant] = useState('');
  const [numero, setNumero] = useState('');
  const [methode, setMethode] = useState('MTN_MOBILE_MONEY');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [fichierImage, setFichierImage] = useState(null);
  const [nouvelleActualite, setNouvelleActualite] = useState({ titre: '', contenu: '' });
  const [montantRetrait, setMontantRetrait] = useState('');
  const [numeroRetrait, setNumeroRetrait] = useState('');
  const [methodeRetrait, setMethodeRetrait] = useState('MTN_MOBILE_MONEY');
  const utilisateurConnecte = JSON.parse(localStorage.getItem('utilisateur') || 'null');

  function charger() {
    setErreur('');
    Promise.all([
      api.get(`/cagnottes/${id}`),
      api.get(`/commentaires/cagnotte/${id}`),
      api.get(`/actualites/cagnotte/${id}`),
    ])
      .then(([resCagnotte, resCommentaires, resActualites]) => {
        setCagnotte(resCagnotte.data);
        setCommentaires(resCommentaires.data);
        setActualites(resActualites.data);
        if (utilisateurConnecte && resCagnotte.data.id_utilisateur === utilisateurConnecte.id_utilisateur) {
          api.get(`/retraits/cagnotte/${id}`).then((res) => setRetraits(res.data));
        }
      })
      .catch((err) => setErreur(err.messageAffichable));
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

  async function uploaderImage(e) {
    e.preventDefault();
    if (!fichierImage) return;
    const formData = new FormData();
    formData.append('image', fichierImage);
    await api.post(`/cagnottes/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setFichierImage(null);
    charger();
  }

  async function publierActualite(e) {
    e.preventDefault();
    await api.post('/actualites', { id_cagnotte: Number(id), ...nouvelleActualite });
    setNouvelleActualite({ titre: '', contenu: '' });
    charger();
  }

  async function demanderRetrait(e) {
    e.preventDefault();
    await api.post('/retraits', {
      id_cagnotte: Number(id),
      montant: Number(montantRetrait),
      methode_retrait: methodeRetrait,
      numero_beneficiaire: numeroRetrait,
    });
    setMontantRetrait('');
    setNumeroRetrait('');
    charger();
  }

  async function supprimerCagnotte() {
    if (!window.confirm('Supprimer définitivement cette cagnotte ? Cette action est irréversible.')) return;
    await api.delete(`/cagnottes/${id}`);
    navigate('/mes-cagnottes');
  }

  async function supprimerCommentaire(idCommentaire) {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await api.delete(`/commentaires/${idCommentaire}`);
    charger();
  }

  if (erreur) return <div className="conteneur"><MessageErreur texte={erreur} onReessayer={charger} /></div>;
  if (!cagnotte) return <div className="conteneur"><Spinner /></div>;

  const pourcentage = Math.min(100, Math.round((cagnotte.montant_collecte / cagnotte.objectif) * 100));
  const estProprietaire = utilisateurConnecte && utilisateurConnecte.id_utilisateur === cagnotte.id_utilisateur;
  const dejaRetire = retraits.filter((r) => ['APPROUVE', 'TRAITE'].includes(r.statut)).reduce((acc, r) => acc + Number(r.montant), 0);
  const disponibleRetrait = Number(cagnotte.montant_collecte) - dejaRetire;

  return (
    <div className="conteneur">
      {cagnotte.image && (
        <img src={`${API_URL}${cagnotte.image}`} alt={cagnotte.titre} style={{ width: '100%', borderRadius: 12, marginBottom: 16 }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <h2>{cagnotte.titre}</h2>
        {estProprietaire && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/cagnottes/${id}/modifier`}>Modifier</Link>
            <button onClick={supprimerCagnotte} style={{ background: 'var(--danger)' }}>Supprimer</button>
          </div>
        )}
      </div>
      <p>{cagnotte.description}</p>

      <div className="carte">
        <p><strong>{formaterMontant(cagnotte.montant_collecte, cagnotte.devise)} / {formaterMontant(cagnotte.objectif, cagnotte.devise)}</strong></p>
        <p style={{ fontSize: 13, color: 'var(--texte-clair)' }}>Du {formaterDate(cagnotte.date_debut)} au {formaterDate(cagnotte.date_fin)}</p>
        <div className="barre-progression">
          <div className="barre-progression-remplissage" style={{ width: `${pourcentage}%` }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="badge">{pourcentage}% atteint</span>
          <span style={{ fontSize: 13, color: 'var(--texte-clair)' }}>{joursRestants(cagnotte.date_fin)}</span>
        </div>
      </div>

      <div className="carte">
        {utilisateurConnecte ? (
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

      {estProprietaire && (
        <>
          <div className="carte">
            <h3>Photo de la cagnotte</h3>
            <form onSubmit={uploaderImage}>
              <input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => setFichierImage(e.target.files[0])} />
              <button type="submit">Envoyer l'image</button>
            </form>
          </div>

          <div className="carte">
            <h3>Retraits</h3>
            <p style={{ fontSize: 14, color: 'var(--texte-clair)' }}>
              Disponible pour retrait : <strong>{formaterMontant(disponibleRetrait, cagnotte.devise)}</strong>
            </p>
            <form onSubmit={demanderRetrait}>
              <input type="number" placeholder="Montant à retirer" value={montantRetrait} onChange={(e) => setMontantRetrait(e.target.value)} required />
              <select value={methodeRetrait} onChange={(e) => setMethodeRetrait(e.target.value)}>
                <option value="MTN_MOBILE_MONEY">MTN Mobile Money</option>
                <option value="ORANGE_MONEY">Orange Money</option>
              </select>
              <input placeholder="Numéro bénéficiaire" value={numeroRetrait} onChange={(e) => setNumeroRetrait(e.target.value)} required />
              <button type="submit">Demander le retrait</button>
            </form>
            {retraits.map((r) => (
              <div key={r.id_retrait} style={{ marginTop: 10, fontSize: 14 }}>
                {formaterMontant(r.montant, cagnotte.devise)} — <span className="badge">{r.statut}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h3>Actualités</h3>
      {estProprietaire && (
        <div className="carte">
          <form onSubmit={publierActualite}>
            <input placeholder="Titre de l'actualité" value={nouvelleActualite.titre} onChange={(e) => setNouvelleActualite({ ...nouvelleActualite, titre: e.target.value })} required />
            <textarea placeholder="Contenu" rows={3} value={nouvelleActualite.contenu} onChange={(e) => setNouvelleActualite({ ...nouvelleActualite, contenu: e.target.value })} required />
            <button type="submit">Publier</button>
          </form>
        </div>
      )}
      {actualites.map((a) => (
        <div key={a.id_actualite} className="carte">
          <strong>{a.titre}</strong>
          <p>{a.contenu}</p>
          <small style={{ color: 'var(--texte-clair)' }}>{formaterDateHeure(a.date_publication)}</small>
        </div>
      ))}
      {actualites.length === 0 && <p>Aucune actualité pour l'instant.</p>}

      <h3>Commentaires</h3>
      {commentaires.map((c) => (
        <div key={c.id_commentaire} className="carte" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>{c.utilisateur.prenom} :</strong> {c.description}</span>
          {utilisateurConnecte && utilisateurConnecte.id_utilisateur === c.id_utilisateur && (
            <button onClick={() => supprimerCommentaire(c.id_commentaire)} style={{ background: 'var(--danger)' }}>Supprimer</button>
          )}
        </div>
      ))}
      {commentaires.length === 0 && <p>Aucun commentaire pour l'instant.</p>}
    </div>
  );
}