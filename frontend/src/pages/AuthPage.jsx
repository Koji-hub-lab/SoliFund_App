import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartHandshake, ArrowLeft, ShieldCheck, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 4.75Z" />
    </svg>
  );
}

function ChampMotDePasse({ value, onChange, id, autoComplete, placeholder = '••••••••' }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        required
        className="h-11 w-full rounded-xl border border-border pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Diviseur() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ou</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function BoutonGoogle() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full gap-2.5"
      onClick={() => alert('Connexion avec Google bientôt disponible.')}
    >
      <GoogleIcon className="size-5" />
      Continuer avec Google
    </Button>
  );
}

export default function AuthPage({ defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab);
  const navigate = useNavigate();
  const { connecter } = useAuth();

  // -- Connexion --
  const [emailLogin, setEmailLogin] = useState('');
  const [mdpLogin, setMdpLogin] = useState('');
  const [erreurLogin, setErreurLogin] = useState('');

  async function soumettreLogin(e) {
    e.preventDefault();
    setErreurLogin('');
    try {
      const res = await api.post('/auth/login', { email: emailLogin, mot_de_passe: mdpLogin });
      connecter(res.data.access_token, res.data.utilisateur);
      navigate('/dashboard');
    } catch (err) {
      setErreurLogin(err.messageAffichable);
    }
  }

  // -- Inscription --
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', mot_de_passe: '', confirmation: '' });
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurSignup, setErreurSignup] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validerSignup() {
    const erreurs = {};
    if (!form.nom.trim()) erreurs.nom = 'Le nom est requis.';
    if (!form.prenom.trim()) erreurs.prenom = 'Le prénom est requis.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) erreurs.email = 'Email invalide.';
    if (form.mot_de_passe.length < 8) erreurs.mot_de_passe = 'Le mot de passe doit contenir au moins 8 caractères.';
    if (form.confirmation !== form.mot_de_passe) erreurs.confirmation = 'Les mots de passe ne correspondent pas.';
    return erreurs;
  }

  async function soumettreSignup(e) {
    e.preventDefault();
    setErreurSignup('');
    const erreurs = validerSignup();
    setErreursChamps(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    try {
      await api.post('/utilisateurs/inscription', {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone ? `+237${form.telephone}` : undefined,
        mot_de_passe: form.mot_de_passe,
      });
      navigate('/login');
    } catch (err) {
      setErreurSignup(err.messageAffichable);
    }
  }

  return (
    <main className="flex min-h-screen bg-background">
      {/* Panneau teal gauche */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <HeartHandshake className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">Solifund</span>
        </Link>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">La solidarité à portée de main au Cameroun</h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Rejoignez des Camerounais qui réalisent leurs projets et soutiennent leurs proches en toute sécurité.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
          <ShieldCheck className="size-4" />
          Paiements locaux 100% sécurisés — MTN &amp; Orange Money
        </div>

        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-64 rounded-full bg-accent/20 blur-2xl" />
      </aside>

      {/* Panneau formulaire droit */}
      <section className="flex w-full flex-col px-4 py-8 sm:px-6 lg:w-1/2 lg:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" />
            Retour à l'accueil
          </Link>
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartHandshake className="size-4" />
            </span>
            <span className="font-bold tracking-tight text-foreground">
              Soli<span className="text-primary">fund</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Bienvenue sur Solifund</h2>
              <p className="mt-1 text-sm text-muted-foreground">Connectez-vous ou créez un compte pour lancer votre cagnotte.</p>
            </div>

            <div className="grid h-11 w-full grid-cols-2 rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`rounded-lg text-sm font-medium transition-colors ${tab === 'login' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => setTab('signup')}
                className={`rounded-lg text-sm font-medium transition-colors ${tab === 'signup' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
              >
                S'inscrire
              </button>
            </div>

            {tab === 'login' ? (
              <form className="mt-6 flex flex-col gap-4" onSubmit={soumettreLogin}>
                <div className="flex flex-col gap-2">
                  <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      required
                      value={emailLogin}
                      onChange={(e) => setEmailLogin(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-sm font-medium text-foreground">Mot de passe</label>
                    
                  </div>
                  <ChampMotDePasse id="login-password" autoComplete="current-password" value={mdpLogin} onChange={(e) => setMdpLogin(e.target.value)} />
                    <Link to="/mot-de-passe-oublie" className="text-sm font-medium text-primary hover:underline">Mot de passe oublié ?</Link>
                </div>
                {erreurLogin && <p className="text-sm text-destructive">{erreurLogin}</p>}
                <Button type="submit" className="h-11">Se connecter</Button>
                <Diviseur />
                <BoutonGoogle />
              </form>
            ) : (
              <form className="mt-6 flex flex-col gap-4" onSubmit={soumettreSignup} noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="signup-prenom" className="text-sm font-medium text-foreground">Prénom</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input id="signup-prenom" name="prenom" type="text" placeholder="Jean" value={form.prenom} onChange={handleChange} className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </div>
                    {erreursChamps.prenom && <p className="text-xs text-destructive">{erreursChamps.prenom}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="signup-nom" className="text-sm font-medium text-foreground">Nom</label>
                    <input id="signup-nom" name="nom" type="text" placeholder="Mballa" value={form.nom} onChange={handleChange} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    {erreursChamps.nom && <p className="text-xs text-destructive">{erreursChamps.nom}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input id="signup-email" name="email" type="email" placeholder="vous@exemple.com" value={form.email} onChange={handleChange} className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                  {erreursChamps.email && <p className="text-xs text-destructive">{erreursChamps.email}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="signup-phone" className="text-sm font-medium text-foreground">Téléphone</label>
                  <div className="flex gap-2">
                    <span className="inline-flex h-11 shrink-0 items-center rounded-xl border border-border bg-secondary px-3 text-sm font-medium text-foreground">+237</span>
                    <div className="relative flex-1">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input id="signup-phone" name="telephone" type="tel" placeholder="6 99 00 00 00" value={form.telephone} onChange={handleChange} className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="signup-password" className="text-sm font-medium text-foreground">Mot de passe</label>
                  <ChampMotDePasse id="signup-password" autoComplete="new-password" value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} />
                  {erreursChamps.mot_de_passe && <p className="text-xs text-destructive">{erreursChamps.mot_de_passe}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
                  <ChampMotDePasse id="signup-confirm" autoComplete="new-password" value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} />
                  {erreursChamps.confirmation && <p className="text-xs text-destructive">{erreursChamps.confirmation}</p>}
                </div>

                {erreurSignup && <p className="text-sm text-destructive">{erreurSignup}</p>}
                <Button type="submit" className="h-11">Créer mon compte</Button>
                <Diviseur />
                <BoutonGoogle />
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  En créant un compte, vous acceptez nos <a href="#" className="text-primary hover:underline">conditions d'utilisation</a>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}