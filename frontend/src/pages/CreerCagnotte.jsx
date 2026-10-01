import { Trans, useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, KeyRound } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import Champ, { classeChamp } from '../components/ui/Champ';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { SymboleNjangi } from '../components/Logo';
import { formaterTaux, useTauxCommission } from '../utils/commission';
import { SqueletteFormulaire } from '../components/ui/Squelette';
import { identiteSoumise, lienVerification, oublierVerification, useVerificationIdentite } from '../utils/identite';

// t : fonction de traduction de la zone « tableau-de-bord ».
function validerForm(form, t) {
  const erreurs = {};
  if (!form.titre.trim()) erreurs.titre = t('creation.erreurs.titre');
  if (!form.objectif || Number(form.objectif) <= 0) erreurs.objectif = t('creation.erreurs.objectif');
  if (!form.date_debut) erreurs.date_debut = t('creation.erreurs.dateDebut');
  if (!form.date_fin) erreurs.date_fin = t('creation.erreurs.dateFin');
  if (form.date_debut && form.date_fin && form.date_fin <= form.date_debut) {
    erreurs.date_fin = t('creation.erreurs.ordreDates');
  }
  return erreurs;
}

export default function CreerCagnotte() {
  const [form, setForm] = useState({
    titre: '', description: '', objectif: '', date_debut: '', date_fin: '', id_categorie: '',
  });
  const [categories, setCategories] = useState([]);
  const [erreurCategories, setErreurCategories] = useState('');
  const [fichierImage, setFichierImage] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Cagnotte créée mais pas encore publiée (EN_VERIFICATION) : écran d'attente à la place du formulaire.
  const [enVerification, setEnVerification] = useState(null);
  const taux = useTauxCommission();
  const { t } = useTranslation('tableau-de-bord');
  const navigate = useNavigate();
  const { utilisateur, connecter } = useAuth();
  const { t: tIdentite } = useTranslation('identite');

  // Vérification d'identité : sans soumission, ou après un refus, un message renvoie vers la page
  // de vérification (le backend refuse sinon la création), qui ramène ici après l'envoi.
  const { verification: identite, erreur: erreurIdentite, recharger: chargerIdentite } = useVerificationIdentite();
  const identiteASoumettre = identite && !identiteSoumise(identite);

  // Compte non vérifié : saisie du code reçu par email avant de pouvoir créer une cagnotte.
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
      await api.post('/auth/verifier-email', { email: utilisateur.email, code: codeVerif });
      connecter(localStorage.getItem('token'), { ...utilisateur, est_verifie: true });
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
      await api.post('/auth/renvoyer-code-verification', { email: utilisateur.email });
      setMessageVerif(t('creation.codeEnvoye'));
    } catch (err) {
      setErreurVerif(err.messageAffichable);
    } finally {
      setEnvoiVerif(false);
    }
  }

  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => setErreurCategories(t('creation.erreurCategories', { detail: err.messageAffichable })));
  }, [t]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleImage(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    setFichierImage(fichier);
    setApercu(URL.createObjectURL(fichier));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurServeur('');
    const erreurs = validerForm(form, t);
    setErreursChamps(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    setEnvoiEnCours(true);
    try {
      const res = await api.post('/cagnottes', {
        ...form,
        objectif: Number(form.objectif),
        id_categorie: form.id_categorie ? Number(form.id_categorie) : undefined,
      });

      if (fichierImage) {
        const formData = new FormData();
        formData.append('image', fichierImage);
        await api.post(`/cagnottes/${res.data.id_cagnotte}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // En ligne tout de suite : sa page, avec les félicitations et les boutons de partage.
      if (res.data.statut === 'ACTIVE') {
        navigate(`/cagnottes/${res.data.id_cagnotte}?creee=1`);
      } else {
        setEnVerification(res.data);
      }
    } catch (err) {
      setErreurServeur(err.messageAffichable);
      setEnvoiEnCours(false);
      // Refus du backend faute de vérification d'identité : le formulaire de vérification revient.
      if (err.response?.status === 403) {
        oublierVerification();
        chargerIdentite();
      }
    }
  }

  if (enVerification) {
    // Seule l'identité manque, ou une vérification par l'équipe est nécessaire (règle de risque).
    const attendIdentite = (enVerification.raisons_verification ?? []).every((r) => r === 'IDENTITE_EN_ATTENTE');
    return (
      <DashboardLayout>
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[32px] border border-border bg-card p-8 text-center sm:p-12">
          <SymboleNjangi taille={88} />
          <h1 className="mt-8 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[36px]">
            {t('creation.enregistreeTitre')}
          </h1>
          <p className="mt-4 max-w-md text-lg leading-[1.6] text-[#45524F]">
            {attendIdentite
              ? t('creation.attenteIdentite')
              : t('creation.attenteEquipe')}
          </p>
          <Button size="lg" to={`/mes-cagnottes/${enVerification.id_cagnotte}`} className="mt-8">
            {t('creation.gerer')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
          {t('creation.titre')}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{t('creation.sousTitre')}</p>

        {utilisateur?.est_verifie === false ? (
          <div className="mt-8 rounded-[32px] border border-border bg-card p-6 sm:p-8">
            <p className="text-base leading-[1.6] text-[#45524F]">
              <Trans t={t} i18nKey="creation.verifierEmail" values={{ email: utilisateur.email }} components={{ b: <strong /> }} />
            </p>
            <form onSubmit={verifierEmail} className="mt-5 flex flex-col gap-4">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  required
                  aria-label={t('commun:code.libelle')}
                  value={codeVerif}
                  onChange={(e) => setCodeVerif(e.target.value.replace(/\D/g, ''))}
                  className={`${classeChamp} h-[52px] pl-11 text-center text-lg font-bold tracking-[0.3em]`}
                />
              </div>
              {erreurVerif && <p className="text-sm text-destructive">{erreurVerif}</p>}
              {messageVerif && <p className="text-sm text-primary">{messageVerif}</p>}
              <Button type="submit" disabled={envoiVerif || codeVerif.length !== 6}>
                {envoiVerif ? t('creation.verification') : t('creation.verifierCode')}
              </Button>
              <button type="button" onClick={renvoyerCode} disabled={envoiVerif} className="self-start inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-primary underline decoration-2 underline-offset-[5px] disabled:cursor-not-allowed disabled:opacity-60">
                {t('creation.renvoyerCode')}
              </button>
            </form>
          </div>
        ) : erreurIdentite ? (
          <div className="mt-8 rounded-[32px] border border-border bg-card p-6 sm:p-8">
            <p className="text-sm text-destructive">{tIdentite('chargement', { detail: erreurIdentite })}</p>
            <Button variant="outline" onClick={chargerIdentite} className="mt-5">{tIdentite('reessayer')}</Button>
          </div>
        ) : !identite ? (
          <div className="mt-8"><SqueletteFormulaire champs={4} /></div>
        ) : identiteASoumettre ? (
          <div className="mt-8 rounded-[32px] border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">{tIdentite('formulaire.titre')}</h2>
            <p className="mt-3 text-base leading-[1.6] text-[#45524F]">
              {identite.statut === 'REFUSEE'
                ? identite.motif_refus
                  ? tIdentite('requise.creationRefusee', { motif: identite.motif_refus })
                  : tIdentite('requise.creationRefuseeSansMotif')
                : tIdentite('requise.creation')}
            </p>
            <Button size="lg" to={lienVerification('/creer-cagnotte')} className="mt-6">
              {tIdentite('carte.verifier')}
            </Button>
          </div>
        ) : (
        <>
        {identite.statut === 'EN_ATTENTE' && (
          <p className="mt-8 rounded-[20px] bg-primary-soft px-5 py-4 text-base leading-[1.6] text-foreground">{tIdentite('enAttente')}</p>
        )}
        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <div>
            <p className="mb-2 block text-sm font-bold text-foreground">{t('creation.photo')}</p>
            <label
              htmlFor="image-cagnotte"
              className="flex aspect-[16/7] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[24px] border-2 border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {apercu ? (
                <img src={apercu} alt={t('creation.altApercu')} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="size-8" />
                  <span className="text-sm font-bold">{t('creation.ajouterPhoto')}</span>
                  <span className="text-xs">{t('creation.formats')}</span>
                </>
              )}
            </label>
            <input id="image-cagnotte" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImage} className="sr-only" />
            {apercu && <p className="mt-1.5 text-sm text-muted-foreground">{t('creation.changerPhoto')}</p>}
          </div>

          <Champ id="titre" name="titre" libelle={t('creation.champTitre')} value={form.titre} onChange={handleChange} placeholder={t('creation.champTitrePlaceholder')} erreur={erreursChamps.titre} />

          <Champ as="textarea" id="description" name="description" libelle={t('creation.description')} value={form.description} onChange={handleChange} rows={5} placeholder={t('creation.descriptionPlaceholder')} />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="objectif" name="objectif" type="number" libelle={t('creation.objectif')} value={form.objectif} onChange={handleChange} placeholder="500000" erreur={erreursChamps.objectif} />
            <Champ as="select" id="id_categorie" name="id_categorie" libelle={t('creation.categorie')} value={form.id_categorie} onChange={handleChange} erreur={erreurCategories}>
              <option value="">{t('creation.aucuneCategorie')}</option>
              {categories.map((cat) => (
                <option key={cat.id_categorie} value={cat.id_categorie}>{cat.nom}</option>
              ))}
            </Champ>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="date_debut" name="date_debut" type="date" libelle={t('creation.dateDebut')} value={form.date_debut} onChange={handleChange} erreur={erreursChamps.date_debut} />
            <Champ id="date_fin" name="date_fin" type="date" libelle={t('creation.dateFin')} value={form.date_fin} onChange={handleChange} erreur={erreursChamps.date_fin} />
          </div>

          {erreurServeur && <p className="text-sm text-destructive">{erreurServeur}</p>}

          {taux !== null && taux > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('creation.commission', { taux: formaterTaux(taux) })}{' '}
              <a href="/conditions#frais" target="_blank" rel="noopener" className="font-bold text-primary underline decoration-2 underline-offset-[5px]">
                {t('creation.conditions')}
              </a>
            </p>
          )}

          <Button type="submit" size="lg" disabled={envoiEnCours} className="mt-2 sm:self-start">
            {envoiEnCours ? t('creation.creationEnCours') : t('creation.creer')}
          </Button>
        </form>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}
