import { Trans, useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { Info, Lock, Smartphone } from 'lucide-react';
import { Button } from '../ui/Button';
import { SymboleNjangi } from '../Logo';
import api from '../../api/axios';
import { formaterMontant } from '../../utils/format';
import { champPilule, champZone, erreurTexte } from './classes';
import ChoixOperateur, { nomOperateur } from './ChoixOperateur';
import { messageNumeroInvalide, normaliserNumero } from '../../utils/telephone';
import { operateurDuNumero, useOperateursMobileMoney } from '../../utils/operateurs';
import { montantsRapides, useConfigurationPublique } from '../../utils/configuration';
import { localeActive } from '../../i18n';

// Attente de la confirmation sur le téléphone : vérification automatique toutes les 5 secondes,
// rappel après 2 minutes, bouton « Réessayer » après 5 minutes.
const INTERVALLE_VERIFICATION_MS = 5_000;
const DELAI_RAPPEL_MS = 2 * 60_000;
const DELAI_REESSAYER_MS = 5 * 60_000;
// Délai avant de recalculer les frais pendant la saisie du montant.
const DELAI_CALCUL_FRAIS_MS = 300;

const choixActif = 'border-primary bg-primary-soft text-primary';
const choixInactif = 'border-border bg-card text-foreground hover:border-primary/40';
const libelle = 'mb-2 block text-sm font-bold text-foreground';

function TitreEtape({ children }) {
  return <h3 className="font-display text-[22px] font-bold leading-tight text-foreground">{children}</h3>;
}

export default function FormulaireDon({ idCagnotte, utilisateurConnecte, executer, charger, enCours, erreurs }) {
  const [montant, setMontant] = useState('');
  const [methode, setMethode] = useState('MTN_MOBILE_MONEY');
  const [numero, setNumero] = useState('');
  const [message, setMessage] = useState('');
  const [anonyme, setAnonyme] = useState(false);
  const [erreursChamps, setErreursChamps] = useState({});
  // 'formulaire' | 'attente' | 'succes' | 'echec'
  const [etape, setEtape] = useState('formulaire');
  const [donEnAttente, setDonEnAttente] = useState(null);
  // Temps passé à attendre la confirmation (ms), mis à jour à chaque vérification.
  const [attenteEcoulee, setAttenteEcoulee] = useState(0);
  // Échec du paiement : { message, peutReessayer, code } renvoyés par le serveur.
  const [echec, setEchec] = useState(null);
  const { t } = useTranslation('cagnotte');
  const chargerRef = useRef(charger);
  useEffect(() => {
    chargerRef.current = charger;
  }, [charger]);

  // Minimum d'un don lu depuis l'API (DON_MONTANT_MINIMUM côté backend). Tant qu'il n'est pas connu,
  // seul un montant positif est exigé : le backend refuse de toute façon un montant trop petit.
  const configuration = useConfigurationPublique();
  const montantMinimum = configuration?.don_montant_minimum ?? null;
  const montantNombre = Number(montant);
  const montantValide =
    Number.isFinite(montantNombre) && montantNombre > 0 && (montantMinimum === null || montantNombre >= montantMinimum);

  // Frais de transaction (GET /dons/frais), payés en plus du don : recalculés à chaque changement du
  // montant ou de l'opérateur. Gardés avec la saisie à laquelle ils correspondent.
  const [frais, setFrais] = useState(null);
  const [erreurFrais, setErreurFrais] = useState(false);
  // Total demandé au téléphone (réponse de POST /dons), affiché pendant l'attente.
  const [totalDemande, setTotalDemande] = useState(null);
  useEffect(() => {
    setErreurFrais(false);
    if (!montantValide) return undefined;
    let actif = true;
    const minuteur = setTimeout(() => {
      api
        .get('/dons/frais', { params: { id_cagnotte: idCagnotte, montant: montantNombre, methode_paiement: methode } })
        .then((res) => actif && setFrais({ ...res.data, methode }))
        .catch(() => actif && setErreurFrais(true));
    }, DELAI_CALCUL_FRAIS_MS);
    return () => {
      actif = false;
      clearTimeout(minuteur);
    };
  }, [idCagnotte, montantNombre, methode, montantValide]);
  const fraisAJour = montantValide && frais?.montant_don === montantNombre && frais.methode === methode ? frais : null;

  // Opérateur du numéro saisi (préfixes MTN / Orange) : choisi automatiquement ; un choix contraire
  // affiche un message sous le champ et bloque l'envoi.
  const operateurs = useOperateursMobileMoney();
  const operateurNumero = operateurDuNumero(numero, operateurs);
  const operateurIncoherent = operateurNumero && operateurNumero !== methode ? operateurNumero : null;
  const messageOperateur = operateurIncoherent
    ? t('don.numeroAutreOperateur', { operateur: operateurs[operateurIncoherent].nom })
    : '';

  function changerNumero(valeur) {
    setNumero(valeur);
    const detecte = operateurDuNumero(valeur, operateurs);
    if (detecte) setMethode(detecte);
  }

  // Applique l'état du don renvoyé par le serveur (création ou vérification).
  function appliquerEtat(don) {
    if (don.statut === 'VALIDE') {
      setEtape('succes');
      setDonEnAttente(null);
      chargerRef.current();
    } else if (don.statut === 'ECHOUE') {
      setEchec({
        message: don.message,
        peutReessayer: !!don.peut_reessayer,
        code: don.code_erreur,
        indisponible: don.code_erreur === 'SERVICE_INDISPONIBLE',
      });
      setEtape('echec');
      setDonEnAttente(null);
    } else if (don.statut === 'EN_ATTENTE' && don.demande_envoyee) {
      // Le backend confirme que la demande est partie vers l'opérateur : le donateur peut confirmer.
      setDonEnAttente(don.id_don);
      setEtape('attente');
    } else {
      // « INDISPONIBLE » : le service de paiement n'a pas répondu, aucune demande confirmée.
      setEchec({ message: don.message || t('don.indisponible.texte'), peutReessayer: true, indisponible: true });
      setEtape('echec');
      setDonEnAttente(null);
    }
  }

  // Tant que le donateur n'a pas confirmé sur son téléphone : vérification automatique du statut.
  useEffect(() => {
    if (etape !== 'attente' || !donEnAttente) return undefined;
    let actif = true;
    const debut = Date.now();
    const minuteur = setInterval(async () => {
      try {
        const res = await api.post(`/dons/${donEnAttente}/verifier-statut`);
        if (!actif) return;
        if (res.data.statut !== 'EN_ATTENTE') appliquerEtat(res.data);
      } catch {
        // Réseau ou serveur indisponible : nouvelle vérification au prochain passage.
      }
      if (actif) setAttenteEcoulee(Date.now() - debut);
    }, INTERVALLE_VERIFICATION_MS);
    return () => {
      actif = false;
      clearInterval(minuteur);
    };
  }, [etape, donEnAttente]);

  function faireDon(e) {
    e?.preventDefault();
    const numeroNormalise = normaliserNumero(numero);
    const nouvellesErreurs = {};
    if (!montantValide) {
      nouvellesErreurs.montant =
        montantMinimum === null ? t('don.montantInvalide') : t('don.montantMinimum', { montant: formaterMontant(montantMinimum) });
    }
    if (!numeroNormalise) nouvellesErreurs.numero = messageNumeroInvalide();
    else if (operateurIncoherent) nouvellesErreurs.numero = messageOperateur;
    setErreursChamps(nouvellesErreurs);
    if (Object.keys(nouvellesErreurs).length > 0) {
      setEtape('formulaire');
      return;
    }

    return executer('don', async () => {
      const res = await api.post('/dons', {
        id_cagnotte: Number(idCagnotte),
        montant: montantNombre,
        methode_paiement: methode,
        numero_payeur: numeroNormalise,
        message: message.trim() || undefined,
        est_anonyme: anonyme,
      });
      setAttenteEcoulee(0);
      setEchec(null);
      setTotalDemande(res.data.montant_total ?? null);
      appliquerEtat(res.data);
    });
  }

  // Retour au formulaire, avec les valeurs déjà saisies (autre opérateur, autre numéro).
  function changerMoyenDePaiement() {
    setDonEnAttente(null);
    setEtape('formulaire');
  }

  function nouveauDon() {
    setMontant('');
    setNumero('');
    setMessage('');
    setAnonyme(false);
    setErreursChamps({});
    setEtape('formulaire');
  }

  if (!utilisateurConnecte) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{t('don.connexion')}</p>
        <Button to="/login" className="mt-3 w-full">{t('don.seConnecter')}</Button>
      </div>
    );
  }

  if (etape === 'attente') {
    return (
      <div className="flex flex-col items-center text-center" aria-live="polite">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Smartphone className="size-6" />
        </span>
        <div className="mt-4">
          <TitreEtape>{t('don.attente.titre')}</TitreEtape>
        </div>
        <p className="mt-2 text-base leading-[1.6] text-[#45524F]">
          <Trans
            t={t}
            i18nKey="don.attente.texte"
            values={{ montant: formaterMontant(totalDemande ?? montantNombre), numero, operateur: nomOperateur(methode) }}
            components={{ b: <strong /> }}
          />
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{t('don.attente.automatique')}</p>
        {attenteEcoulee >= DELAI_RAPPEL_MS && (
          <p className="mt-3 text-base font-bold leading-[1.6] text-foreground">
            {attenteEcoulee >= DELAI_REESSAYER_MS ? t('don.attente.tropLong') : t('don.attente.rienRecu')}
          </p>
        )}
        {attenteEcoulee >= DELAI_REESSAYER_MS && (
          <Button onClick={changerMoyenDePaiement} className="mt-5 w-full">
            {t('commun:actions.reessayer')}
          </Button>
        )}
      </div>
    );
  }

  if (etape === 'succes') {
    return (
      <div className="flex flex-col items-center text-center" aria-live="polite">
        <SymboleNjangi taille={64} />
        <div className="mt-4">
          <TitreEtape>{t('don.succes.titre', { prenom: utilisateurConnecte.prenom })}</TitreEtape>
        </div>
        <p className="mt-2 text-base leading-[1.6] text-[#45524F]">
          <Trans t={t} i18nKey="don.succes.texte" values={{ montant: formaterMontant(montantNombre) }} components={{ b: <strong /> }} />
        </p>
        <Button variant="outline" onClick={nouveauDon} className="mt-5 w-full">
          {t('don.succes.autre')}
        </Button>
      </div>
    );
  }

  if (etape === 'echec') {
    return (
      <div className="flex flex-col items-center text-center" aria-live="polite">
        <TitreEtape>{echec?.indisponible ? t('don.indisponible.titre') : t('don.echec.titre')}</TitreEtape>
        <p className="mt-2 text-base leading-[1.6] text-[#45524F]">
          {echec?.message || t('don.echec.texte')}
        </p>
        {/* « Réessayer » relance un nouveau don avec les mêmes informations. */}
        {echec?.peutReessayer && (
          <Button onClick={() => faireDon()} disabled={enCours.don} className="mt-5 w-full">
            {enCours.don ? t('commun:actions.envoiEnCours') : t('commun:actions.reessayer')}
          </Button>
        )}
        {echec?.code !== 'MONTANT_INCOHERENT' && (
          <Button variant="outline" onClick={changerMoyenDePaiement} disabled={enCours.don} className={`w-full ${echec?.peutReessayer ? 'mt-3' : 'mt-5'}`}>
            {t('don.echec.changer')}
          </Button>
        )}
        {erreurs.don && <p className={`mt-3 ${erreurTexte}`}>{erreurs.don}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={faireDon} noValidate className="flex flex-col gap-5">
      <TitreEtape>{t('don.titre')}</TitreEtape>

      <div>
        <div className="grid grid-cols-4 gap-2">
          {montantsRapides(montantMinimum).map((m) => {
            const actif = montantNombre === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={actif}
                onClick={() => setMontant(String(m))}
                className={`h-11 rounded-full border-2 px-0 font-sans text-sm font-bold transition-colors ${actif ? choixActif : choixInactif}`}
              >
                {m.toLocaleString(localeActive())}
              </button>
            );
          })}
        </div>
        <label htmlFor="don-montant" className={`${libelle} mt-4`}>{t('don.montant')}</label>
        <input
          id="don-montant"
          type="number"
          inputMode="numeric"
          min={montantMinimum ?? 1}
          placeholder={t('don.montantPlaceholder')}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          aria-invalid={!!erreursChamps.montant}
          aria-describedby={erreursChamps.montant ? 'don-montant-erreur' : undefined}
          className={champPilule}
        />
        {erreursChamps.montant && <p id="don-montant-erreur" className={`mt-1.5 ${erreurTexte}`}>{erreursChamps.montant}</p>}

        {/* Récapitulatif mis à jour pendant la saisie : le minimum s'applique au don, pas au total. */}
        {montantValide && (
          <dl className="m-0 mt-4 flex flex-col gap-2 rounded-[18px] border border-border bg-background px-4 py-3 text-sm" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#45524F]">{t('don.recapitulatif.don')}</dt>
              <dd className="m-0 text-foreground">{formaterMontant(montantNombre)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[#45524F]">
                {t('don.recapitulatif.frais')}
                <span className="group relative inline-flex">
                  <button
                    type="button"
                    aria-label={t('don.recapitulatif.infoFrais')}
                    aria-describedby="don-explication-frais"
                    className="inline-flex size-6 items-center justify-center rounded-full bg-transparent p-0 text-muted-foreground hover:text-primary"
                  >
                    <Info className="size-4" />
                  </button>
                  <span
                    id="don-explication-frais"
                    role="tooltip"
                    className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[14px] bg-encre px-3 py-2 text-[13px] leading-[1.5] text-[#FBF7F1] group-focus-within:visible group-hover:visible"
                  >
                    {t('don.recapitulatif.explicationFrais')}
                  </span>
                </span>
              </dt>
              <dd className="m-0 text-foreground">
                {fraisAJour ? formaterMontant(fraisAJour.montant_frais) : erreurFrais ? '—' : t('don.recapitulatif.calcul')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <dt className="font-bold text-foreground">{t('don.recapitulatif.total')}</dt>
              <dd className="m-0 font-bold text-foreground">
                {fraisAJour ? formaterMontant(fraisAJour.montant_total) : erreurFrais ? '—' : t('don.recapitulatif.calcul')}
              </dd>
            </div>
            {erreurFrais && <p className="m-0 text-[13px] text-muted-foreground">{t('don.recapitulatif.indisponible')}</p>}
          </dl>
        )}
      </div>

      <ChoixOperateur libelle={t('don.payerAvec')} valeur={methode} onChanger={setMethode} />

      <div>
        <label htmlFor="don-numero" className={libelle}>{t('don.numero')}</label>
        <input
          id="don-numero"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="6XX XX XX XX"
          value={numero}
          onChange={(e) => changerNumero(e.target.value)}
          aria-invalid={!!(erreursChamps.numero || messageOperateur)}
          aria-describedby={erreursChamps.numero || messageOperateur ? 'don-numero-erreur' : undefined}
          className={champPilule}
        />
        {/* Le message d'opérateur s'affiche dès que le choix contredit le numéro saisi. */}
        {(messageOperateur || erreursChamps.numero) && (
          <p id="don-numero-erreur" className={`mt-1.5 ${erreurTexte}`} aria-live="polite">
            {messageOperateur || erreursChamps.numero}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="don-message" className={libelle}>{t('don.message')}</label>
        <textarea
          id="don-message"
          rows={2}
          maxLength={500}
          placeholder={t('don.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={champZone}
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground">
        <input
          type="checkbox"
          checked={anonyme}
          onChange={(e) => setAnonyme(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer p-0 accent-primary"
        />
        {t('don.anonyme')}
      </label>

      <div>
        <Button type="submit" variant="don" size="xl" disabled={enCours.don || !!operateurIncoherent} className="w-full">
          {enCours.don
            ? t('commun:actions.envoiEnCours')
            : fraisAJour
              ? t('don.payerMontant', { montant: formaterMontant(fraisAJour.montant_total) })
              : t('don.donner')}
        </Button>
        {erreurs.don && <p className={`mt-2 ${erreurTexte}`}>{erreurs.don}</p>}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
          <Lock className="size-3.5" />
          {t('don.confirmation')}
        </p>
      </div>
    </form>
  );
}
