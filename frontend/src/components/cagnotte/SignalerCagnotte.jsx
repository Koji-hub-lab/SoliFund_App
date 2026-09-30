import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import Confirmation from '../ui/Confirmation';
import Champ from '../ui/Champ';
import api from '../../api/axios';
import { MOTIFS_SIGNALEMENT } from '../../utils/statuts';

// Lien discret « Signaler cette cagnotte » : ouvre une fenêtre avec le choix du motif et un
// commentaire facultatif. Ouvert à tous, connecté ou non.
export default function SignalerCagnotte({ idCagnotte }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState('ARNAQUE');
  const [envoye, setEnvoye] = useState(false);
  const { t } = useTranslation('cagnotte');

  async function envoyer(commentaire) {
    await api.post(`/cagnottes/${idCagnotte}/signaler`, { motif, commentaire: commentaire || undefined });
    setOuvert(false);
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <p className="text-center text-sm text-muted-foreground" role="status">
        {t('signalement.merci')}
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex min-h-11 items-center self-center bg-transparent p-0 font-sans text-sm font-medium text-muted-foreground underline decoration-1 underline-offset-4 hover:text-foreground"
      >
        {t('signalement.lien')}
      </button>

      <Confirmation
        ouvert={ouvert}
        titre={t('signalement.titre')}
        message={t('signalement.texte')}
        libelleConfirmer={t('signalement.envoyer')}
        variante="default"
        motif={{ libelle: t('signalement.commentaire'), obligatoire: false, placeholder: t('signalement.commentairePlaceholder') }}
        onConfirmer={envoyer}
        onAnnuler={() => setOuvert(false)}
      >
        <Champ as="select" id="signalement-motif" libelle={t('signalement.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}>
          {MOTIFS_SIGNALEMENT.map((valeur) => (
            <option key={valeur} value={valeur}>{t(`signalement.motifs.${valeur}`)}</option>
          ))}
        </Champ>
      </Confirmation>
    </>
  );
}
