import { useEffect, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import Champ from '../components/ui/Champ';
import ChampMotDePasse from '../components/auth/ChampMotDePasse';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formaterMontant } from '../utils/format';

const MDP_VIDE = { actuel: '', nouveau: '', confirmation: '' };

function validerMotDePasse(mdp) {
  const erreurs = {};
  if (!mdp.actuel) erreurs.actuel = 'Saisissez votre mot de passe actuel.';
  if (mdp.nouveau.length < 8) erreurs.nouveau = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
  if (mdp.confirmation !== mdp.nouveau) erreurs.confirmation = 'Les deux mots de passe ne correspondent pas.';
  return erreurs;
}

export default function Compte() {
  const { utilisateur, connecter, deconnecter, rafraichirUtilisateur } = useAuth();
  const [mesCagnottes, setMesCagnottes] = useState([]);
  const [erreurCagnottes, setErreurCagnottes] = useState('');
  const [form, setForm] = useState({ nom: utilisateur.nom, prenom: utilisateur.prenom, telephone: utilisateur.telephone || '' });
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [mdp, setMdp] = useState(MDP_VIDE);
  const [erreursMdp, setErreursMdp] = useState({});
  const [messageMdp, setMessageMdp] = useState('');
  const [erreurMdp, setErreurMdp] = useState('');
  const [mdpEnCours, setMdpEnCours] = useState(false);

  useEffect(() => {
    api.get('/cagnottes/mes')
      .then((res) => setMesCagnottes(res.data))
      .catch((err) => setErreurCagnottes(err.messageAffichable));
  }, []);

  // Pré-remplissage avec le profil à jour du serveur (la copie locale n'a pas forcément le téléphone).
  useEffect(() => {
    rafraichirUtilisateur()
      .then((profil) => {
        if (profil) setForm({ nom: profil.nom, prenom: profil.prenom, telephone: profil.telephone || '' });
      })
      .catch((err) => setErreur(err.messageAffichable));
  }, [rafraichirUtilisateur]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');
    setEnvoiEnCours(true);
    try {
      const res = await api.patch('/utilisateurs/moi', { nom: form.nom, prenom: form.prenom, telephone: form.telephone });
      connecter(localStorage.getItem('token'), { ...utilisateur, ...res.data });
      setForm({ nom: res.data.nom, prenom: res.data.prenom, telephone: res.data.telephone || '' });
      setMessage('Profil mis à jour avec succès.');
    } catch (err) {
      setErreur(err.messageAffichable);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function changerChampMdp(e) {
    setMdp({ ...mdp, [e.target.name]: e.target.value });
  }

  // Le changement invalide le jeton actuel (côté serveur) : on reconnecte aussitôt l'utilisateur
  // avec son nouveau mot de passe pour qu'il reste connecté.
  async function changerMotDePasse(e) {
    e.preventDefault();
    setErreurMdp('');
    setMessageMdp('');
    const erreurs = validerMotDePasse(mdp);
    setErreursMdp(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    setMdpEnCours(true);
    try {
      await api.patch('/utilisateurs/moi/mot-de-passe', { ancien_mot_de_passe: mdp.actuel, nouveau_mot_de_passe: mdp.nouveau });
    } catch (err) {
      setErreurMdp(err.messageAffichable);
      setMdpEnCours(false);
      return;
    }
    try {
      const res = await api.post('/auth/login', { email: utilisateur.email, mot_de_passe: mdp.nouveau });
      connecter(res.data.access_token, { ...utilisateur, ...res.data.utilisateur });
      setMdp(MDP_VIDE);
      setMessageMdp('Votre mot de passe a été modifié.');
    } catch {
      // Mot de passe changé mais reconnexion impossible : l'ancien jeton n'est plus valide.
      deconnecter();
    } finally {
      setMdpEnCours(false);
    }
  }

  const totalCollecte = mesCagnottes.reduce((acc, c) => acc + Number(c.montant_collecte), 0);
  const initiales = `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
            Mon profil
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">Gérez vos informations personnelles.</p>
        </div>

        {/* Carte identité + chiffres */}
        <section className="flex flex-col items-center gap-5 rounded-[28px] border border-border bg-card p-6 sm:flex-row sm:p-7">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent font-display text-2xl font-bold text-encre" aria-hidden="true">
            {initiales}
          </span>
          <div className="min-w-0 text-center sm:text-left">
            <p className="truncate font-display text-xl font-bold text-foreground">{utilisateur.prenom} {utilisateur.nom}</p>
            <p className="truncate text-sm text-muted-foreground">{utilisateur.email}</p>
          </div>
          <div className="flex gap-3 sm:ml-auto">
            <div className="rounded-[18px] bg-background px-5 py-3 text-center">
              <p className="font-display text-xl font-bold text-foreground">{mesCagnottes.length}</p>
              <p className="text-xs text-muted-foreground">Cagnotte{mesCagnottes.length > 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-[18px] bg-background px-5 py-3 text-center">
              <p className="font-display text-xl font-bold text-primary">{formaterMontant(totalCollecte)}</p>
              <p className="text-xs text-muted-foreground">Collectés</p>
            </div>
          </div>
        </section>
        {erreurCagnottes && (
          <p className="-mt-4 text-sm text-destructive">Vos chiffres n'ont pas pu être chargés. {erreurCagnottes}</p>
        )}

        {/* Formulaire de modification */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">Modifier mes informations</h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="prenom" name="prenom" libelle="Prénom" value={form.prenom} onChange={handleChange} />
            <Champ id="nom" name="nom" libelle="Nom" value={form.nom} onChange={handleChange} />
          </div>

          <Champ id="email" libelle="Email" value={utilisateur.email} disabled aide="L'email ne peut pas être modifié pour l'instant." />

          <Champ id="telephone" name="telephone" libelle="Téléphone" value={form.telephone} onChange={handleChange} placeholder="+237 6 99 00 00 00" />

          {message && <p className="text-sm text-primary">{message}</p>}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}

          <Button type="submit" disabled={envoiEnCours} className="sm:self-start">
            {envoiEnCours ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </form>

        {/* Changement du mot de passe */}
        <form onSubmit={changerMotDePasse} noValidate className="flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <div>
            <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">Changer le mot de passe</h2>
            <p className="mt-1 text-sm text-muted-foreground">Vos autres appareils seront déconnectés.</p>
          </div>

          {/* Pour l'enregistrement du mot de passe par le navigateur. */}
          <input type="email" name="email" value={utilisateur.email} autoComplete="username" readOnly hidden />

          <ChampMotDePasse
            id="mdp-actuel"
            name="actuel"
            libelle="Mot de passe actuel"
            value={mdp.actuel}
            onChange={changerChampMdp}
            erreur={erreursMdp.actuel}
            autoComplete="current-password"
          />
          <ChampMotDePasse
            id="mdp-nouveau"
            name="nouveau"
            libelle="Nouveau mot de passe"
            value={mdp.nouveau}
            onChange={changerChampMdp}
            erreur={erreursMdp.nouveau}
            aide="8 caractères minimum."
            autoComplete="new-password"
          />
          <ChampMotDePasse
            id="mdp-confirmation"
            name="confirmation"
            libelle="Confirmer le nouveau mot de passe"
            value={mdp.confirmation}
            onChange={changerChampMdp}
            erreur={erreursMdp.confirmation}
            autoComplete="new-password"
          />

          {messageMdp && <p className="text-sm text-primary">{messageMdp}</p>}
          {erreurMdp && <p className="text-sm text-destructive">{erreurMdp}</p>}

          <Button type="submit" disabled={mdpEnCours} className="sm:self-start">
            {mdpEnCours ? 'Modification en cours...' : 'Changer le mot de passe'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
