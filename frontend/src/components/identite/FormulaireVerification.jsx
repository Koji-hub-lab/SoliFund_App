import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '../ui/Button';
import Champ from '../ui/Champ';
import BarreProgression from '../BarreProgression';
import ChoixOperateur from '../cagnotte/ChoixOperateur';
import api from '../../api/axios';
import { messageNumeroInvalide, normaliserNumero } from '../../utils/telephone';
import { operateurDuNumero, useOperateursMobileMoney } from '../../utils/operateurs';

// Vérification d'identité en 4 étapes (POST /verification-identite, en multipart) : pièce,
// informations, photos, numéro de retrait. Mêmes règles que le backend, vérifiées étape par étape ;
// le backend les applique de toute façon à l'envoi.
const ETAPES = ['piece', 'identite', 'photos', 'retrait'];
const TYPES_PIECE = ['CNI', 'RECEPISSE_CNI', 'PASSEPORT'];
const FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX = 5 * 1024 * 1024;

const choixActif = 'border-primary bg-primary-soft text-primary';
const choixInactif = 'border-border bg-card text-foreground hover:border-primary/40';

// Date du jour (AAAA-MM-JJ, heure locale) : comparable aux valeurs des champs de date.
function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Zone photo en pointillés (même style que la photo d'une cagnotte).
function ChampPhoto({ id, libelle, aide, photo, erreur, onChoisir, t }) {
  return (
    <div>
      <p className="mb-2 block text-sm font-bold text-foreground">{libelle}</p>
      <label
        htmlFor={id}
        className={`flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[24px] border-2 border-dashed bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary ${erreur ? 'border-destructive' : 'border-border'}`}
      >
        {photo ? (
          <img src={photo.apercu} alt={libelle} className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-8" />
            <span className="text-sm font-bold">{t('formulaire.ajouterPhoto')}</span>
            <span className="text-xs">{t('formulaire.formats')}</span>
          </>
        )}
      </label>
      <input id={id} type="file" accept={FORMATS.join(', ')} onChange={(e) => onChoisir(e.target.files[0])} className="sr-only" />
      {erreur && <p className="mt-1.5 text-sm text-destructive">{erreur}</p>}
      {!erreur && photo && <p className="mt-1.5 text-sm text-muted-foreground">{t('formulaire.changerPhoto')}</p>}
      {!erreur && !photo && aide && <p className="mt-1.5 text-sm text-muted-foreground">{aide}</p>}
    </div>
  );
}

export default function FormulaireVerification({ refus, onSoumise }) {
  const { t } = useTranslation('identite');
  const [etape, setEtape] = useState(0);
  const [form, setForm] = useState({
    type_piece: 'CNI', numero_piece: '', date_expiration: '', nom: '', prenoms: '', date_naissance: '',
    telephone_retrait: '', methode_retrait: 'MTN_MOBILE_MONEY',
  });
  const [photos, setPhotos] = useState({ recto: null, verso: null, selfie: null });
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const operateurs = useOperateursMobileMoney();

  const passeport = form.type_piece === 'PASSEPORT';
  const recepisse = form.type_piece === 'RECEPISSE_CNI';

  function changer(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function changerNumero(e) {
    const valeur = e.target.value;
    const detecte = operateurDuNumero(valeur, operateurs);
    setForm({ ...form, telephone_retrait: valeur, ...(detecte ? { methode_retrait: detecte } : {}) });
  }

  function choisirPhoto(nom, fichier) {
    if (!fichier) return;
    let erreur = '';
    if (!FORMATS.includes(fichier.type)) erreur = t('formulaire.erreurs.format');
    else if (fichier.size > TAILLE_MAX) erreur = t('formulaire.erreurs.taille');
    setErreurs({ ...erreurs, [nom]: erreur || undefined });
    if (erreur) return;
    if (photos[nom]) URL.revokeObjectURL(photos[nom].apercu);
    setPhotos({ ...photos, [nom]: { fichier, apercu: URL.createObjectURL(fichier) } });
  }

  // Erreurs de l'étape affichée ; un objet vide si elle est complète.
  function erreursEtape(numero) {
    const e = {};
    const jour = aujourdhui();
    if (ETAPES[numero] === 'piece') {
      if (!form.numero_piece.trim()) e.numero_piece = t('formulaire.erreurs.numeroPiece');
      if (!form.date_expiration && !recepisse) e.date_expiration = t('formulaire.erreurs.dateExpiration');
      else if (form.date_expiration && form.date_expiration < jour) e.date_expiration = t('formulaire.erreurs.pieceExpiree');
    } else if (ETAPES[numero] === 'identite') {
      if (!form.nom.trim()) e.nom = t('formulaire.erreurs.nom');
      if (!form.prenoms.trim()) e.prenoms = t('formulaire.erreurs.prenoms');
      const [annee, mois, j] = jour.split('-');
      if (!form.date_naissance || form.date_naissance > jour) e.date_naissance = t('formulaire.erreurs.dateNaissance');
      else if (form.date_naissance > `${Number(annee) - 18}-${mois}-${j}`) e.date_naissance = t('formulaire.erreurs.ageMinimum');
    } else if (ETAPES[numero] === 'photos') {
      if (!photos.recto) e.recto = t('formulaire.erreurs.photo');
      if (!photos.verso && !passeport) e.verso = t('formulaire.erreurs.photo');
      if (!photos.selfie) e.selfie = t('formulaire.erreurs.photo');
    } else {
      const numero = normaliserNumero(form.telephone_retrait);
      const detecte = numero && operateurDuNumero(numero, operateurs);
      if (!numero) e.telephone_retrait = messageNumeroInvalide();
      else if (detecte && detecte !== form.methode_retrait) {
        e.telephone_retrait = t('cagnotte:don.numeroAutreOperateur', { operateur: operateurs[detecte].nom });
      }
    }
    return e;
  }

  function continuer(e) {
    e.preventDefault();
    const nouvelles = erreursEtape(etape);
    setErreurs(nouvelles);
    if (Object.keys(nouvelles).length > 0) return;
    if (etape < ETAPES.length - 1) {
      setEtape(etape + 1);
      return;
    }
    envoyer();
  }

  async function envoyer() {
    setErreurServeur('');
    setEnvoiEnCours(true);
    const donnees = new FormData();
    for (const [nom, valeur] of Object.entries(form)) {
      if (nom === 'date_expiration' && !valeur) continue;
      donnees.append(nom, nom === 'telephone_retrait' ? normaliserNumero(valeur) : valeur.trim());
    }
    donnees.append('recto', photos.recto.fichier);
    if (photos.verso && !passeport) donnees.append('verso', photos.verso.fichier);
    donnees.append('selfie', photos.selfie.fichier);
    try {
      const res = await api.post('/verification-identite', donnees, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSoumise(res.data);
    } catch (err) {
      setErreurServeur(err.messageAffichable);
      setEnvoiEnCours(false);
    }
  }

  const nomEtape = ETAPES[etape];
  const derniere = etape === ETAPES.length - 1;

  return (
    <div className="mt-8 rounded-[32px] border border-border bg-card p-6 sm:p-8">
      <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">{t('formulaire.titre')}</h2>
      <p className="mt-3 text-base leading-[1.6] text-[#45524F]">{t('formulaire.intro')}</p>
      {refus && (
        <p className="mt-4 rounded-[16px] bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {refus.motif_refus ? t('formulaire.refusee', { motif: refus.motif_refus }) : t('formulaire.refuseeSansMotif')}
        </p>
      )}

      <div className="mt-6">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">
          {t('formulaire.etape', { numero: etape + 1, total: ETAPES.length })}
        </p>
        <h3 className="mt-1 font-display text-[22px] font-bold leading-tight text-foreground">{t(`formulaire.etapes.${nomEtape}`)}</h3>
        <BarreProgression pourcentage={((etape + 1) / ETAPES.length) * 100} className="mt-3" />
      </div>

      <form onSubmit={continuer} noValidate className="mt-6 flex flex-col gap-6">
        {nomEtape === 'piece' && (
          <>
            <div>
              <p className="mb-2 block text-sm font-bold text-foreground">{t('formulaire.typePiece')}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TYPES_PIECE.map((type) => {
                  const actif = form.type_piece === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => setForm({ ...form, type_piece: type })}
                      className={`min-h-11 rounded-[18px] border-2 px-3 py-3 text-left font-sans text-sm font-bold transition-colors ${actif ? choixActif : choixInactif}`}
                    >
                      {t(`formulaire.types.${type}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Champ id="numero_piece" name="numero_piece" libelle={t('formulaire.numeroPiece')} value={form.numero_piece} onChange={changer} maxLength={50} erreur={erreurs.numero_piece} />
              <Champ
                id="date_expiration"
                name="date_expiration"
                type="date"
                libelle={recepisse ? t('formulaire.dateExpirationFacultative') : t('formulaire.dateExpiration')}
                value={form.date_expiration}
                onChange={changer}
                erreur={erreurs.date_expiration}
              />
            </div>
          </>
        )}

        {nomEtape === 'identite' && (
          <>
            <p className="text-sm text-muted-foreground">{t('formulaire.aideIdentite')}</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Champ id="nom" name="nom" libelle={t('formulaire.nom')} value={form.nom} onChange={changer} maxLength={100} autoComplete="family-name" erreur={erreurs.nom} />
              <Champ id="prenoms" name="prenoms" libelle={t('formulaire.prenoms')} value={form.prenoms} onChange={changer} maxLength={150} autoComplete="given-name" erreur={erreurs.prenoms} />
            </div>
            <Champ id="date_naissance" name="date_naissance" type="date" libelle={t('formulaire.dateNaissance')} value={form.date_naissance} onChange={changer} autoComplete="bday" erreur={erreurs.date_naissance} className="sm:max-w-xs" />
          </>
        )}

        {nomEtape === 'photos' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <ChampPhoto id="photo-recto" libelle={passeport ? t('formulaire.pagePasseport') : t('formulaire.recto')} photo={photos.recto} erreur={erreurs.recto} onChoisir={(f) => choisirPhoto('recto', f)} t={t} />
            {!passeport && (
              <ChampPhoto id="photo-verso" libelle={t('formulaire.verso')} photo={photos.verso} erreur={erreurs.verso} onChoisir={(f) => choisirPhoto('verso', f)} t={t} />
            )}
            <ChampPhoto id="photo-selfie" libelle={t('formulaire.selfie')} aide={t('formulaire.aideSelfie')} photo={photos.selfie} erreur={erreurs.selfie} onChoisir={(f) => choisirPhoto('selfie', f)} t={t} />
          </div>
        )}

        {nomEtape === 'retrait' && (
          <>
            <ChoixOperateur libelle={t('formulaire.operateurRetrait')} valeur={form.methode_retrait} onChanger={(m) => setForm({ ...form, methode_retrait: m })} />
            <Champ
              id="telephone_retrait"
              name="telephone_retrait"
              type="tel"
              inputMode="tel"
              prefixe="+237"
              libelle={t('formulaire.telephoneRetrait')}
              value={form.telephone_retrait}
              onChange={changerNumero}
              placeholder="6XX XX XX XX"
              aide={t('formulaire.aideRetrait')}
              erreur={erreurs.telephone_retrait}
            />
            <p className="text-sm leading-[1.6] text-[#45524F]">
              {t('formulaire.recapitulatif', {
                piece: t(`formulaire.types.${form.type_piece}`),
                numero: form.numero_piece.trim(),
                prenoms: form.prenoms.trim(),
                nom: form.nom.trim(),
                telephone: normaliserNumero(form.telephone_retrait) ?? form.telephone_retrait,
              })}
            </p>
          </>
        )}

        {erreurServeur && <p className="text-sm text-destructive">{erreurServeur}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {etape > 0 ? (
            <Button type="button" variant="outline" size="lg" onClick={() => setEtape(etape - 1)} disabled={envoiEnCours}>
              {t('formulaire.retour')}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" disabled={envoiEnCours}>
            {derniere ? (envoiEnCours ? t('formulaire.envoiEnCours') : t('formulaire.envoyer')) : t('formulaire.continuer')}
          </Button>
        </div>
      </form>
    </div>
  );
}
