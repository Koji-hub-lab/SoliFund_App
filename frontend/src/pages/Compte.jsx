import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import Champ from '../components/ui/Champ';
import ChampMotDePasse from '../components/auth/ChampMotDePasse';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formaterMontant } from '../utils/format';
import CarteVerification from '../components/identite/CarteVerification';

const MDP_VIDE = { actuel: '', nouveau: '', confirmation: '' };

// avecActuel : faux pour un compte créé avec Google, qui n'a pas encore de mot de passe.
// t : fonction de traduction de la zone « tableau-de-bord ».
function validerMotDePasse(mdp, avecActuel, t) {
  const erreurs = {};
  if (avecActuel && !mdp.actuel) erreurs.actuel = t('profil.motDePasse.erreurActuel');
  if (mdp.nouveau.length < 8) erreurs.nouveau = t('profil.motDePasse.erreurNouveau');
  if (mdp.confirmation !== mdp.nouveau) erreurs.confirmation = t('profil.motDePasse.erreurConfirmation');
  return erreurs;
}

export default function Compte() {
  const { utilisateur, connecter, deconnecter, rafraichirUtilisateur } = useAuth();
  const { t } = useTranslation('tableau-de-bord');
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
      setMessage(t('profil.misAJour'));
    } catch (err) {
      setErreur(err.messageAffichable);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function changerChampMdp(e) {
    setMdp({ ...mdp, [e.target.name]: e.target.value });
  }

  // Compte créé avec Google, sans mot de passe : « Définir un mot de passe », sans l'ancien.
  // (a_mot_de_passe vient de /utilisateurs/moi ; absent = compte avec mot de passe.)
  const sansMotDePasse = utilisateur.a_mot_de_passe === false;

  // Le changement invalide le jeton actuel (côté serveur) : on reconnecte aussitôt l'utilisateur
  // avec son nouveau mot de passe pour qu'il reste connecté.
  async function changerMotDePasse(e) {
    e.preventDefault();
    setErreurMdp('');
    setMessageMdp('');
    const erreurs = validerMotDePasse(mdp, !sansMotDePasse, t);
    setErreursMdp(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    setMdpEnCours(true);
    try {
      await api.patch(
        '/utilisateurs/moi/mot-de-passe',
        sansMotDePasse ? { nouveau_mot_de_passe: mdp.nouveau } : { ancien_mot_de_passe: mdp.actuel, nouveau_mot_de_passe: mdp.nouveau },
      );
    } catch (err) {
      setErreurMdp(err.messageAffichable);
      setMdpEnCours(false);
      return;
    }
    try {
      const res = await api.post('/auth/login', { email: utilisateur.email, mot_de_passe: mdp.nouveau });
      connecter(res.data.access_token, { ...utilisateur, ...res.data.utilisateur, a_mot_de_passe: true });
      setMdp(MDP_VIDE);
      setMessageMdp(sansMotDePasse ? t('profil.motDePasse.defini') : t('profil.motDePasse.modifie'));
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
            {t('profil.titre')}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{t('profil.sousTitre')}</p>
        </div>

        {/* Vérification d'identité : en haut, c'est l'étape qui débloque la création et les retraits. */}
        <CarteVerification />

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
              <p className="text-xs text-muted-foreground">{t('profil.cagnottes', { count: mesCagnottes.length })}</p>
            </div>
            <div className="rounded-[18px] bg-background px-5 py-3 text-center">
              <p className="font-display text-xl font-bold text-primary">{formaterMontant(totalCollecte)}</p>
              <p className="text-xs text-muted-foreground">{t('profil.collectes')}</p>
            </div>
          </div>
        </section>
        {erreurCagnottes && (
          <p className="-mt-4 text-sm text-destructive">{t('profil.erreurChiffres', { detail: erreurCagnottes })}</p>
        )}

        {/* Formulaire de modification */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">{t('profil.modifier')}</h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="prenom" name="prenom" libelle={t('profil.prenom')} value={form.prenom} onChange={handleChange} />
            <Champ id="nom" name="nom" libelle={t('profil.nom')} value={form.nom} onChange={handleChange} />
          </div>

          <Champ id="email" libelle={t('profil.email')} value={utilisateur.email} disabled aide={t('profil.emailAide')} />

          <Champ id="telephone" name="telephone" libelle={t('profil.telephone')} value={form.telephone} onChange={handleChange} placeholder="+237 6 99 00 00 00" />

          {message && <p className="text-sm text-primary">{message}</p>}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}

          <Button type="submit" disabled={envoiEnCours} className="sm:self-start">
            {envoiEnCours ? t('commun:actions.enregistrement') : t('profil.enregistrer')}
          </Button>
        </form>

        {/* Changement (ou définition, pour un compte Google) du mot de passe */}
        <form onSubmit={changerMotDePasse} noValidate className="flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <div>
            <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">
              {sansMotDePasse ? t('profil.motDePasse.definiTitre') : t('profil.motDePasse.changerTitre')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sansMotDePasse
                ? t('profil.motDePasse.definiTexte')
                : t('profil.motDePasse.changerTexte')}
            </p>
          </div>

          {/* Pour l'enregistrement du mot de passe par le navigateur. */}
          <input type="email" name="email" value={utilisateur.email} autoComplete="username" readOnly hidden />

          {!sansMotDePasse && (
            <ChampMotDePasse
              id="mdp-actuel"
              name="actuel"
              libelle={t('profil.motDePasse.actuel')}
              value={mdp.actuel}
              onChange={changerChampMdp}
              erreur={erreursMdp.actuel}
              autoComplete="current-password"
            />
          )}
          <ChampMotDePasse
            id="mdp-nouveau"
            name="nouveau"
            libelle={t('profil.motDePasse.nouveau')}
            value={mdp.nouveau}
            onChange={changerChampMdp}
            erreur={erreursMdp.nouveau}
            aide={t('profil.motDePasse.aide')}
            autoComplete="new-password"
          />
          <ChampMotDePasse
            id="mdp-confirmation"
            name="confirmation"
            libelle={t('profil.motDePasse.confirmer')}
            value={mdp.confirmation}
            onChange={changerChampMdp}
            erreur={erreursMdp.confirmation}
            autoComplete="new-password"
          />

          {messageMdp && <p className="text-sm text-primary">{messageMdp}</p>}
          {erreurMdp && <p className="text-sm text-destructive">{erreurMdp}</p>}

          <Button type="submit" disabled={mdpEnCours} className="sm:self-start">
            {mdpEnCours ? t('commun:actions.enregistrement') : sansMotDePasse ? t('profil.motDePasse.definir') : t('profil.motDePasse.changer')}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
