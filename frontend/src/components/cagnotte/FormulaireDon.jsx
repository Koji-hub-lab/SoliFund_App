import { Trans, useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Lock, Smartphone } from 'lucide-react';
import { Button } from '../ui/Button';
import { SymboleNjangi } from '../Logo';
import api from '../../api/axios';
import { formaterMontant } from '../../utils/format';
import { champPilule, champZone, erreurTexte } from './classes';
import ChoixOperateur, { nomOperateur } from './ChoixOperateur';
import { messageNumeroInvalide, normaliserNumero } from '../../utils/telephone';
import { localeActive } from '../../i18n';

const MONTANTS_RAPIDES = [1000, 2000, 5000, 10000];
const MONTANT_MIN = 100; // même minimum que le backend (CreateDonDto)

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
  const [toujoursEnAttente, setToujoursEnAttente] = useState(false);
  const { t } = useTranslation('cagnotte');

  const montantNombre = Number(montant);
  const montantValide = Number.isFinite(montantNombre) && montantNombre >= MONTANT_MIN;

  function faireDon(e) {
    e.preventDefault();
    const numeroNormalise = normaliserNumero(numero);
    const nouvellesErreurs = {};
    if (!montantValide) nouvellesErreurs.montant = t('don.montantMinimum', { montant: formaterMontant(MONTANT_MIN) });
    if (!numeroNormalise) nouvellesErreurs.numero = messageNumeroInvalide();
    setErreursChamps(nouvellesErreurs);
    if (Object.keys(nouvellesErreurs).length > 0) return;

    return executer('don', async () => {
      const res = await api.post('/dons', {
        id_cagnotte: Number(idCagnotte),
        montant: montantNombre,
        methode_paiement: methode,
        numero_payeur: numeroNormalise,
        message: message.trim() || undefined,
        est_anonyme: anonyme,
      });
      setDonEnAttente(res.data.id_don);
      setToujoursEnAttente(false);
      setEtape('attente');
    });
  }

  function verifierDon() {
    return executer('don', async () => {
      const res = await api.post(`/dons/${donEnAttente}/verifier-statut`);
      if (res.data.statut === 'VALIDE') {
        setEtape('succes');
        setDonEnAttente(null);
        charger();
      } else if (res.data.statut === 'ECHOUE') {
        setEtape('echec');
        setDonEnAttente(null);
      } else {
        setToujoursEnAttente(true);
      }
    });
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
            values={{ montant: formaterMontant(montantNombre), numero, operateur: nomOperateur(methode) }}
            components={{ b: <strong /> }}
          />
        </p>
        <Button onClick={verifierDon} disabled={enCours.don} className="mt-5 w-full">
          {enCours.don ? t('don.attente.verification') : t('don.attente.verifier')}
        </Button>
        {toujoursEnAttente && !enCours.don && (
          <p className="mt-3 text-sm text-muted-foreground">{t('don.attente.toujours')}</p>
        )}
        {erreurs.don && <p className={`mt-3 ${erreurTexte}`}>{erreurs.don}</p>}
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
        <TitreEtape>{t('don.echec.titre')}</TitreEtape>
        <p className="mt-2 text-base leading-[1.6] text-[#45524F]">
          {t('don.echec.texte')}
        </p>
        <Button onClick={() => setEtape('formulaire')} className="mt-5 w-full">
          {t('commun:actions.reessayer')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={faireDon} noValidate className="flex flex-col gap-5">
      <TitreEtape>{t('don.titre')}</TitreEtape>

      <div>
        <div className="grid grid-cols-4 gap-2">
          {MONTANTS_RAPIDES.map((m) => {
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
          min={MONTANT_MIN}
          placeholder={t('don.montantPlaceholder')}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          aria-invalid={!!erreursChamps.montant}
          aria-describedby={erreursChamps.montant ? 'don-montant-erreur' : undefined}
          className={champPilule}
        />
        {erreursChamps.montant && <p id="don-montant-erreur" className={`mt-1.5 ${erreurTexte}`}>{erreursChamps.montant}</p>}
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
          onChange={(e) => setNumero(e.target.value)}
          aria-invalid={!!erreursChamps.numero}
          aria-describedby={erreursChamps.numero ? 'don-numero-erreur' : undefined}
          className={champPilule}
        />
        {erreursChamps.numero && <p id="don-numero-erreur" className={`mt-1.5 ${erreurTexte}`}>{erreursChamps.numero}</p>}
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
        <Button type="submit" variant="don" size="xl" disabled={enCours.don} className="w-full">
          {enCours.don ? t('commun:actions.envoiEnCours') : montantValide ? t('don.donnerMontant', { montant: formaterMontant(montantNombre) }) : t('don.donner')}
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
