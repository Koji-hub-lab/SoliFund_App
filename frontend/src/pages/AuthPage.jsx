import { Trans, useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import Champ from '../components/ui/Champ';
import SaisieCode from '../components/ui/SaisieCode';
import MiseEnPageAuth from '../components/auth/MiseEnPageAuth';
import ChampMotDePasse from '../components/auth/ChampMotDePasse';
import api, { API_URL } from '../api/axios';
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

function Diviseur() {
  const { t } = useTranslation('auth');
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-sm font-bold text-muted-foreground">{t('ou')}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

// Message affiché au retour d'une connexion Google refusée (/login?erreur=google&motif=...).
// Le motif est un code : aucun texte libre venant de l'adresse n'est affiché.
function messageGoogle(t, motif) {
  return t(`google.motifs.${motif}`, { defaultValue: t('google.echec') });
}

// Navigation complète vers le backend (proxy « /api » en développement), qui redirige vers Google.
function BoutonGoogle() {
  const { t } = useTranslation('auth');
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full gap-2.5"
      href={`${API_URL}/auth/google`}
    >
      <GoogleIcon className="size-5" />
      {t('google.continuer')}
    </Button>
  );
}

export default function AuthPage({ defaultTab = 'login' }) {
  const { t } = useTranslation('auth');
  const [tab, setTab] = useState(defaultTab);
  const navigate = useNavigate();
  const { connecter } = useAuth();

  // -- Connexion --
  const [emailLogin, setEmailLogin] = useState('');
  const [mdpLogin, setMdpLogin] = useState('');
  const [parametres] = useSearchParams();
  const [erreurLogin, setErreurLogin] = useState(() =>
    parametres.get('erreur') === 'google' ? messageGoogle(t, parametres.get('motif')) : '',
  );

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

  // -- Vérification de l'email (après l'inscription) --
  const [emailAVerifier, setEmailAVerifier] = useState('');
  const [codeVerif, setCodeVerif] = useState('');
  const [erreurVerif, setErreurVerif] = useState('');
  const [messageVerif, setMessageVerif] = useState('');
  const [envoiVerif, setEnvoiVerif] = useState(false);

  async function verifierEmail(e) {
    e.preventDefault();
    setErreurVerif('');
    setMessageVerif('');
    setEnvoiVerif(true);
    try {
      await api.post('/auth/verifier-email', { email: emailAVerifier, code: codeVerif });
      navigate('/login');
    } catch (err) {
      setErreurVerif(err.messageAffichable);
    } finally {
      setEnvoiVerif(false);
    }
  }

  async function renvoyerCode() {
    setErreurVerif('');
    setMessageVerif('');
    setEnvoiVerif(true);
    try {
      await api.post('/auth/renvoyer-code-verification', { email: emailAVerifier });
      setMessageVerif(t('verification.codeEnvoye'));
    } catch (err) {
      setErreurVerif(err.messageAffichable);
    } finally {
      setEnvoiVerif(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validerSignup() {
    const erreurs = {};
    if (!form.nom.trim()) erreurs.nom = t('inscription.erreurs.nom');
    if (!form.prenom.trim()) erreurs.prenom = t('inscription.erreurs.prenom');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) erreurs.email = t('inscription.erreurs.email');
    if (form.mot_de_passe.length < 8) erreurs.mot_de_passe = t('inscription.erreurs.motDePasse');
    if (form.confirmation !== form.mot_de_passe) erreurs.confirmation = t('inscription.erreurs.confirmation');
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
      setEmailAVerifier(form.email);
    } catch (err) {
      setErreurSignup(err.messageAffichable);
    }
  }

  const titre = 'font-display text-[36px] font-extrabold leading-tight tracking-[-0.03em] text-foreground';
  const lienCharte = 'inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-primary underline decoration-2 underline-offset-[5px]  disabled:cursor-not-allowed disabled:opacity-60';
  const codeComplet = /^\d{6}$/.test(codeVerif);

  if (emailAVerifier) {
    return (
      <MiseEnPageAuth>
        <h1 className={titre}>{t('verification.titre')}</h1>
        <p className="mt-2 text-base leading-[1.6] text-muted-foreground">
          <Trans t={t} i18nKey="verification.texte" values={{ email: emailAVerifier }} components={{ b: <strong className="text-foreground" /> }} />
        </p>
        <form onSubmit={verifierEmail} className="mt-8 flex flex-col gap-5">
          <div>
            <SaisieCode valeur={codeVerif} onChange={setCodeVerif} erreur={!!erreurVerif} autoFocus />
            {erreurVerif && <p className="mt-2 text-sm text-destructive">{erreurVerif}</p>}
            {messageVerif && <p className="mt-2 text-sm text-primary">{messageVerif}</p>}
          </div>
          <Button type="submit" size="lg" disabled={envoiVerif || !codeComplet} className="w-full">
            {envoiVerif ? t('verification.enCours') : t('verification.verifier')}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={renvoyerCode} disabled={envoiVerif} className={lienCharte}>
              {t('verification.renvoyer')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              {t('verification.plusTard')}
            </button>
          </div>
        </form>
      </MiseEnPageAuth>
    );
  }

  return (
    <MiseEnPageAuth>
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {[
          ['login', t('onglets.login')],
          ['signup', t('onglets.signup')],
        ].map(([valeur, libelle]) => (
          <button
            key={valeur}
            type="button"
            role="tab"
            aria-selected={tab === valeur}
            onClick={() => setTab(valeur)}
            className={`h-12 rounded-full border font-sans text-base font-bold transition-colors ${
              tab === valeur ? 'border-encre bg-encre text-primary-foreground hover:bg-encre' : 'border-border bg-card text-foreground hover:bg-secondary'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {tab === 'login' ? (
        <>
          <h1 className={`mt-8 ${titre}`}>{t('connexion.titre')}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t('connexion.sousTitre')}</p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={soumettreLogin}>
            <Champ
              id="login-email"
              type="email"
              libelle={t('champs.email')}
              placeholder={t('champs.emailPlaceholder')}
              autoComplete="email"
              required
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
            />
            <div>
              <ChampMotDePasse
                id="login-password"
                libelle={t('champs.motDePasse')}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={mdpLogin}
                onChange={(e) => setMdpLogin(e.target.value)}
              />
              <div className="mt-2 text-right">
                <Link to="/mot-de-passe-oublie" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline decoration-2 underline-offset-[5px]">
                  {t('connexion.motDePasseOublie')}
                </Link>
              </div>
            </div>
            {erreurLogin && <p className="text-sm text-destructive">{erreurLogin}</p>}
            <Button type="submit" size="lg" className="w-full">{t('connexion.bouton')}</Button>
            <Diviseur />
            <BoutonGoogle />
          </form>
        </>
      ) : (
        <>
          <h1 className={`mt-8 ${titre}`}>{t('inscription.titre')}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t('inscription.sousTitre')}</p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={soumettreSignup} noValidate>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Champ id="signup-prenom" name="prenom" libelle={t('champs.prenom')} placeholder="Jean" autoComplete="given-name" value={form.prenom} onChange={handleChange} erreur={erreursChamps.prenom} />
              <Champ id="signup-nom" name="nom" libelle={t('champs.nom')} placeholder="Mballa" autoComplete="family-name" value={form.nom} onChange={handleChange} erreur={erreursChamps.nom} />
            </div>
            <Champ id="signup-email" name="email" type="email" libelle={t('champs.email')} placeholder={t('champs.emailPlaceholder')} autoComplete="email" value={form.email} onChange={handleChange} erreur={erreursChamps.email} />
            <Champ id="signup-phone" name="telephone" type="tel" libelle={t('champs.telephone')} prefixe="+237" placeholder="6 99 00 00 00" autoComplete="tel-national" value={form.telephone} onChange={handleChange} />
            <ChampMotDePasse
              id="signup-password"
              libelle={t('champs.motDePasse')}
              placeholder={t('champs.motDePassePlaceholder')}
              autoComplete="new-password"
              value={form.mot_de_passe}
              onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })}
              erreur={erreursChamps.mot_de_passe}
            />
            <ChampMotDePasse
              id="signup-confirm"
              libelle={t('champs.confirmer')}
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.confirmation}
              onChange={(e) => setForm({ ...form, confirmation: e.target.value })}
              erreur={erreursChamps.confirmation}
            />
            {erreurSignup && <p className="text-sm text-destructive">{erreurSignup}</p>}
            <Button type="submit" size="lg" className="w-full">{t('inscription.bouton')}</Button>
            <Diviseur />
            <BoutonGoogle />
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              <Trans
                t={t}
                i18nKey="inscription.acceptation"
                components={{
                  c: <a href="/conditions" target="_blank" rel="noopener" className="font-bold text-primary underline decoration-2 underline-offset-[5px]" />,
                  p: <a href="/confidentialite" target="_blank" rel="noopener" className="font-bold text-primary underline decoration-2 underline-offset-[5px]" />,
                }}
              />
            </p>
          </form>
        </>
      )}
    </MiseEnPageAuth>
  );
}
