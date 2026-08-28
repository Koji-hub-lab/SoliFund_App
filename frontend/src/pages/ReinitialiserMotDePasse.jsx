import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, HeartHandshake, Eye, EyeOff } from 'lucide-react';
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

export default function ReinitialiserMotDePasse() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const navigate = useNavigate();

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');

    if (!code) {
      setErreur('Lien invalide.');
      return;
    }
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
      await api.post('/auth/reinitialiser-mot-de-passe', { code, mot_de_passe: motDePasse });
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

        <h1 className="text-xl font-bold text-foreground">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choisis un nouveau mot de passe pour ton compte.</p>

        {!code ? (
          <p className="mt-6 text-sm text-destructive">
            Ce lien est invalide. <Link to="/mot-de-passe-oublie" className="underline">Redemande un lien</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <ChampMotDePasse value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="Nouveau mot de passe" />
            <ChampMotDePasse value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Confirmer le mot de passe" />
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" disabled={envoiEnCours} className="h-11">
              {envoiEnCours ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}