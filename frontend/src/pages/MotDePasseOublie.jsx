import { Trans, useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import Champ from '../components/ui/Champ';
import SaisieCode from '../components/ui/SaisieCode';
import MiseEnPageAuth from '../components/auth/MiseEnPageAuth';
import ChampMotDePasse from '../components/auth/ChampMotDePasse';
import api from '../api/axios';

const titre = 'font-display text-[36px] font-extrabold leading-tight tracking-[-0.03em] text-foreground';
const lienCharte = 'inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-primary underline decoration-2 underline-offset-[5px]  disabled:cursor-not-allowed disabled:opacity-60';

export default function MotDePasseOublie() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [etape, setEtape] = useState('email'); // 'email' | 'code' | 'nouveau-mdp'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  // Erreurs affichées sous les champs du nouveau mot de passe.
  const [erreursMdp, setErreursMdp] = useState({});
  const [message, setMessage] = useState('');
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

  // Même appel que envoyerCode, depuis l'étape « code ».
  async function renvoyerCode() {
    setErreur('');
    setMessage('');
    setEnvoiEnCours(true);
    try {
      await api.post('/auth/mot-de-passe-oublie', { email });
      setMessage(t('verification.codeEnvoye'));
    } catch (err) {
      setErreur(err.messageAffichable);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function verifierCode(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');
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
    const erreurs = {};
    if (motDePasse.length < 8) erreurs.motDePasse = t('inscription.erreurs.motDePasse');
    else if (motDePasse !== confirmation) erreurs.confirmation = t('inscription.erreurs.confirmation');
    setErreursMdp(erreurs);
    if (Object.keys(erreurs).length > 0) return;

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
    <MiseEnPageAuth>
      {etape === 'email' && (
        <>
          <h1 className={titre}>{t('oubli.titre')}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t('oubli.sousTitre')}</p>

          <form onSubmit={envoyerCode} className="mt-8 flex flex-col gap-5">
            <Champ
              id="oubli-email"
              type="email"
              libelle={t('champs.email')}
              placeholder={t('champs.emailPlaceholder')}
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              erreur={erreur}
            />
            <Button type="submit" size="lg" disabled={envoiEnCours} className="w-full">
              {envoiEnCours ? t('commun:actions.envoiEnCours') : t('oubli.envoyer')}
            </Button>
          </form>
        </>
      )}

      {etape === 'code' && (
        <>
          <h1 className={titre}>{t('oubli.codeTitre')}</h1>
          <p className="mt-2 text-base leading-[1.6] text-muted-foreground">
            <Trans t={t} i18nKey="verification.texte" values={{ email }} components={{ b: <strong className="text-foreground" /> }} />
          </p>

          <form onSubmit={verifierCode} className="mt-8 flex flex-col gap-5">
            <div>
              <SaisieCode valeur={code} onChange={setCode} erreur={!!erreur} autoFocus />
              {erreur && <p className="mt-2 text-sm text-destructive">{erreur}</p>}
              {message && <p className="mt-2 text-sm text-primary">{message}</p>}
            </div>
            <Button type="submit" size="lg" disabled={envoiEnCours || !/^\d{6}$/.test(code)} className="w-full">
              {envoiEnCours ? t('verification.enCours') : t('verification.verifier')}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={renvoyerCode} disabled={envoiEnCours} className={lienCharte}>
                {t('verification.renvoyer')}
              </button>
              <button
                type="button"
                onClick={() => { setErreur(''); setMessage(''); setCode(''); setEtape('email'); }}
                className="inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                {t('oubli.recommencer')}
              </button>
            </div>
          </form>
        </>
      )}

      {etape === 'nouveau-mdp' && (
        <>
          <h1 className={titre}>{t('oubli.nouveauTitre')}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t('oubli.nouveauSousTitre')}</p>

          <form onSubmit={reinitialiser} noValidate className="mt-8 flex flex-col gap-5">
            <ChampMotDePasse
              id="nouveau-mdp"
              libelle={t('champs.nouveauMotDePasse')}
              placeholder={t('champs.motDePassePlaceholder')}
              autoComplete="new-password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              erreur={erreursMdp.motDePasse}
            />
            <ChampMotDePasse
              id="confirmation-mdp"
              libelle={t('champs.confirmer')}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              erreur={erreursMdp.confirmation}
            />
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" size="lg" disabled={envoiEnCours} className="w-full">
              {envoiEnCours ? t('commun:actions.enregistrement') : t('oubli.reinitialiser')}
            </Button>
          </form>
        </>
      )}

      <p className="mt-8 text-center">
        <Link to="/login" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline decoration-2 underline-offset-[5px]">
          {t('oubli.retour')}
        </Link>
      </p>
    </MiseEnPageAuth>
  );
}
