import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, HeartHandshake, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import api from '../api/axios';

function ChampMotDePasse({ value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        required
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-border pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export default function MotDePasseOublie() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState('email'); // 'email' | 'code' | 'nouveau-mdp'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function envoyerCode(e) {
    e.preventDefault();
    setErreur('');
    setEnvoiEnCours(true);
    try {
      await api.post('/auth/mot-de-passe-oublie', { email });
      setEtape('code');
    } catch (err) {
      setErreur(err.messageAffichable);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function verifierCode(e) {
    e.preventDefault();
    setErreur('');
    setEnvoiEnCours(true);
    try {
      await api.post('/auth/verifier-code', { email, code });
      setEtape('nouveau-mdp');
    } catch (err) {
      setErreur(err.messageAffichable);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function reinitialiser(e) {
    e.preventDefault();
    setErreur('');
    if (motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur('Les mots de passe ne correspondent pas.');
      return;
    }
    setEnvoiEnCours(true);
    try {
      await api.post('/auth/reinitialiser-mot-de-passe', { email, code, mot_de_passe: motDePasse });
      navigate('/login');
    } catch (err) {
      setErreur(err.messageAffichable);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartHandshake className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Soli<span className="text-primary">fund</span>
          </span>
        </Link>

        {etape === 'email' && (
          <>
            <h1 className="text-xl font-bold text-foreground">Mot de passe oublié</h1>
            <p className="mt-1 text-sm text-muted-foreground">Entre ton email, on t'envoie un code de vérification.</p>

            <form onSubmit={envoyerCode} className="mt-6 flex flex-col gap-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" placeholder="vous@exemple.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              {erreur && <p className="text-sm text-destructive">{erreur}</p>}
              <Button type="submit" disabled={envoiEnCours} className="h-11">
                {envoiEnCours ? 'Envoi en cours...' : 'Envoyer le code'}
              </Button>
            </form>
          </>
        )}

        {etape === 'code' && (
          <>
            <h1 className="text-xl font-bold text-foreground">Vérification</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              On a envoyé un code à 6 chiffres à <strong>{email}</strong>. Vérifie aussi tes spams.
            </p>

            <form onSubmit={verifierCode} className="mt-6 flex flex-col gap-4">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="h-12 w-full rounded-xl border border-border pl-9 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {erreur && <p className="text-sm text-destructive">{erreur}</p>}
              <Button type="submit" disabled={envoiEnCours || code.length !== 6} className="h-11">
                {envoiEnCours ? 'Vérification...' : 'Vérifier le code'}
              </Button>
              <button type="button" onClick={() => setEtape('email')} className="text-sm font-medium text-muted-foreground hover:text-primary">
                Mauvais email ? Recommencer
              </button>
            </form>
          </>
        )}

        {etape === 'nouveau-mdp' && (
          <>
            <h1 className="text-xl font-bold text-foreground">Nouveau mot de passe</h1>
            <p className="mt-1 text-sm text-muted-foreground">Code vérifié. Choisis ton nouveau mot de passe.</p>

            <form onSubmit={reinitialiser} className="mt-6 flex flex-col gap-4">
              <ChampMotDePasse value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="Nouveau mot de passe" />
              <ChampMotDePasse value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Confirmer le mot de passe" />
              {erreur && <p className="text-sm text-destructive">{erreur}</p>}
              <Button type="submit" disabled={envoiEnCours} className="h-11">
                {envoiEnCours ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
              </Button>
            </form>
          </>
        )}

        <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}