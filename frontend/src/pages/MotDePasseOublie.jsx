import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, HeartHandshake } from 'lucide-react';
import { Button } from '../components/ui/Button';
import api from '../api/axios';

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    setEnvoiEnCours(true);
    try {
      await api.post('/auth/mot-de-passe-oublie', { email });
      setEnvoye(true);
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

        {envoye ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">Email envoyé !</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Si un compte existe avec cet email, tu vas recevoir un lien pour réinitialiser ton mot de passe. Pense à vérifier tes spams.
            </p>
            <Button to="/login" variant="outline" className="mt-6 w-full">Retour à la connexion</Button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-foreground">Mot de passe oublié</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre ton email, on t'envoie un lien pour créer un nouveau mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {erreur && <p className="text-sm text-destructive">{erreur}</p>}
              <Button type="submit" disabled={envoiEnCours} className="h-11">
                {envoiEnCours ? 'Envoi en cours...' : 'Envoyer le lien'}
              </Button>
            </form>

            <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
              <ArrowLeft className="size-4" />
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}