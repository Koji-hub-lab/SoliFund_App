import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import Champ from './Champ';
import { useTranslation } from 'react-i18next';

// Fenêtre de confirmation de la charte, basée sur <dialog> (focus piégé, fermeture avec Échap).
// motif : { libelle, obligatoire, placeholder } pour demander un motif ; onConfirmer(motif) peut
// renvoyer une promesse ; l'erreur éventuelle (err.messageAffichable) s'affiche dans la fenêtre.
// children : champs supplémentaires affichés avant le motif (ex. une liste de choix).
export default function Confirmation({
  ouvert,
  titre,
  message,
  libelleConfirmer,
  variante = 'danger',
  motif,
  onConfirmer,
  onAnnuler,
  children,
}) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [texteMotif, setTexteMotif] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const dialogue = ref.current;
    if (!dialogue) return;
    if (ouvert && !dialogue.open) {
      setTexteMotif('');
      setErreur('');
      dialogue.showModal();
    } else if (!ouvert && dialogue.open) {
      dialogue.close();
    }
  }, [ouvert]);

  const motifManquant = motif?.obligatoire && !texteMotif.trim();

  async function confirmer(e) {
    e.preventDefault();
    if (enCours || motifManquant) return;
    setEnCours(true);
    setErreur('');
    try {
      await onConfirmer(texteMotif.trim());
    } catch (err) {
      setErreur(err?.messageAffichable ?? t('erreurs:actionImpossible'));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!enCours) onAnnuler();
      }}
      aria-labelledby="confirmation-titre"
      className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-[28px] border border-border bg-card p-0 text-foreground backdrop:bg-encre/60"
    >
      <form onSubmit={confirmer} className="flex flex-col gap-5 p-6 sm:p-7">
        <div>
          <h2 id="confirmation-titre" className="font-display text-[22px] font-bold leading-tight">{titre}</h2>
          {message && <p className="mt-2 text-[15px] leading-[1.6] text-[#45524F]">{message}</p>}
        </div>

        {children}

        {motif && (
          <Champ
            as="textarea"
            id="confirmation-motif"
            libelle={motif.obligatoire ? motif.libelle : t('commun:actions.facultatif', { libelle: motif.libelle })}
            placeholder={motif.placeholder}
            rows={3}
            maxLength={500}
            value={texteMotif}
            onChange={(e) => setTexteMotif(e.target.value)}
            autoFocus={!children}
          />
        )}

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onAnnuler} disabled={enCours}>
            {t('commun:actions.annuler')}
          </Button>
          <Button type="submit" variant={variante} disabled={enCours || motifManquant} autoFocus={!motif}>
            {enCours ? t('commun:actions.enCours') : (libelleConfirmer ?? t('commun:actions.confirmer'))}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
