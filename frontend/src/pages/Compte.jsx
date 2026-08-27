import { useEffect, useState } from 'react';
import { User, Mail, Phone, Lock } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formaterMontant } from '../utils/format';

export default function Compte() {
  const { utilisateur, connecter } = useAuth();
  const [mesCagnottes, setMesCagnottes] = useState([]);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', mot_de_passe: '' });
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
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
    setEnvoiEnCours(true);
    try {
      const donnees = { nom: form.nom, prenom: form.prenom, telephone: form.telephone };
      if (form.mot_de_passe) donnees.mot_de_passe = form.mot_de_passe;
      const res = await api.patch('/utilisateurs/moi', donnees);
      connecter(localStorage.getItem('token'), { ...utilisateur, ...res.data });
      setMessage('Profil mis à jour avec succès.');
      setForm({ ...form, mot_de_passe: '' });
    } catch (err) {
      setErreur(err.messageAffichable);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  const totalCollecte = mesCagnottes.reduce((acc, c) => acc + Number(c.montant_collecte), 0);
  const initiales = `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
        <p className="mt-1 text-muted-foreground">Gère tes informations personnelles.</p>

        {/* Carte identité + stats */}
        <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {initiales}
          </span>
          <div className="text-center sm:text-left">
            <p className="text-lg font-semibold text-foreground">{utilisateur.prenom} {utilisateur.nom}</p>
            <p className="text-sm text-muted-foreground">{utilisateur.email}</p>
          </div>
          <div className="ml-0 flex gap-6 sm:ml-auto">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{mesCagnottes.length}</p>
              <p className="text-xs text-muted-foreground">Cagnottes</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{formaterMontant(totalCollecte)}</p>
              <p className="text-xs text-muted-foreground">Collectés</p>
            </div>
          </div>
        </div>

        {/* Formulaire modification */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Modifier mes informations</h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="prenom" className="mb-2 block text-sm font-medium text-foreground">Prénom</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="prenom" name="prenom" value={form.prenom} onChange={handleChange} className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div>
              <label htmlFor="nom" className="mb-2 block text-sm font-medium text-foreground">Nom</label>
              <input id="nom" name="nom" value={form.nom} onChange={handleChange} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={utilisateur.email} disabled className="h-11 w-full cursor-not-allowed rounded-xl border border-border bg-secondary pl-9 text-sm text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">L'email ne peut pas être modifié pour l'instant.</p>
          </div>

          <div>
            <label htmlFor="telephone" className="mb-2 block text-sm font-medium text-foreground">Téléphone</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input id="telephone" name="telephone" value={form.telephone} onChange={handleChange} placeholder="+237 6 99 00 00 00" className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label htmlFor="mot_de_passe" className="mb-2 block text-sm font-medium text-foreground">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input id="mot_de_passe" name="mot_de_passe" type="password" value={form.mot_de_passe} onChange={handleChange} placeholder="Laisser vide pour ne pas changer" className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {message && <p className="text-sm text-primary">{message}</p>}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}

          <Button type="submit" disabled={envoiEnCours} className="self-start">
            {envoiEnCours ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}