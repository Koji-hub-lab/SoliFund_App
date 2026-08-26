import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formaterMontant } from '../utils/format';

export default function Compte() {
  const { utilisateur, connecter } = useAuth();
  const [mesCagnottes, setMesCagnottes] = useState([]);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', mot_de_passe: '' });
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!utilisateur) return;
    api.get('/cagnottes').then((res) => {
      setMesCagnottes(res.data.filter((c) => c.id_utilisateur === utilisateur.id_utilisateur));
    });
    setForm({ nom: utilisateur.nom, prenom: utilisateur.prenom, telephone: utilisateur.telephone || '', mot_de_passe: '' });
  }, [utilisateur]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');
    try {
      const donnees = { nom: form.nom, prenom: form.prenom, telephone: form.telephone };
      if (form.mot_de_passe) donnees.mot_de_passe = form.mot_de_passe;
      const res = await api.patch('/utilisateurs/moi', donnees);
      connecter(localStorage.getItem('token'), { ...utilisateur, ...res.data });
      setMessage('Profil mis à jour.');
      setForm({ ...form, mot_de_passe: '' });
    } catch (err) {
      setErreur(err.messageAffichable);
    }
  }

  if (!utilisateur) return <div className="conteneur"><p>Connecte-toi pour voir ton compte.</p></div>;

  const totalCollecte = mesCagnottes.reduce((acc, c) => acc + Number(c.montant_collecte), 0);

  return (
    <div className="conteneur">
      <h2>Mon compte</h2>
      <div className="carte">
        <p style={{ color: 'var(--texte-clair)' }}>{utilisateur.email}</p>
        <div className="stat-bloc">
          <div>
            <div className="stat-chiffre">{mesCagnottes.length}</div>
            <div className="stat-label">Cagnotte{mesCagnottes.length > 1 ? 's' : ''} créée{mesCagnottes.length > 1 ? 's' : ''}</div>
          </div>
          <div>
            <div className="stat-chiffre">{formaterMontant(totalCollecte)}</div>
            <div className="stat-label">collectés au total</div>
          </div>
        </div>
      </div>

      <div className="carte">
        <h3>Modifier mon profil</h3>
        <form onSubmit={handleSubmit}>
          <input name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} />
          <input name="prenom" placeholder="Prénom" value={form.prenom} onChange={handleChange} />
          <input name="telephone" placeholder="Téléphone" value={form.telephone} onChange={handleChange} />
          <input name="mot_de_passe" type="password" placeholder="Nouveau mot de passe (laisser vide pour ne pas changer)" value={form.mot_de_passe} onChange={handleChange} />
          <button type="submit">Enregistrer</button>
        </form>
        {message && <p className="succes-texte">{message}</p>}
        {erreur && <p className="erreur">{erreur}</p>}
      </div>
    </div>
  );
}