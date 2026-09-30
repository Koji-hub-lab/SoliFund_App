import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import PastilleInitiale from './PastilleInitiale';
import api from '../../api/axios';
import { formaterDateRelative } from '../../utils/format';
import { champPilule, erreurTexte, lienCharte, titreSection } from './classes';

export default function CommentairesCagnotte({ idCagnotte, commentaires, infos, utilisateurConnecte, executer, charger, onVoirPlus, enCours, erreurs }) {
  const [nouveauCommentaire, setNouveauCommentaire] = useState('');
  const { t } = useTranslation('cagnotte');

  function publier(e) {
    e.preventDefault();
    if (!nouveauCommentaire.trim()) return;
    return executer('commentaire', async () => {
      await api.post('/commentaires', { id_cagnotte: Number(idCagnotte), description: nouveauCommentaire });
      setNouveauCommentaire('');
      charger();
    });
  }

  function supprimer(idCommentaire) {
    if (!window.confirm(t('commentaires.confirmerSuppression'))) return;
    return executer('listeCommentaires', async () => {
      await api.delete(`/commentaires/${idCommentaire}`);
      charger();
    });
  }

  return (
    <div>
      <h2 className={titreSection}>{t('commentaires.titre')}</h2>

      {utilisateurConnecte ? (
        <form onSubmit={publier} className="mt-5 flex gap-3">
          <input
            aria-label={t('commentaires.champ')}
            placeholder={t('commentaires.placeholder')}
            value={nouveauCommentaire}
            onChange={(e) => setNouveauCommentaire(e.target.value)}
            className={`${champPilule} flex-1`}
          />
          <Button type="submit" disabled={enCours.commentaire}>
            {enCours.commentaire ? t('commun:actions.envoiEnCours') : t('commentaires.publier')}
          </Button>
        </form>
      ) : (
        <p className="mt-5">
          <Link to="/login" className={lienCharte}>{t('commentaires.connexion')}</Link>
        </p>
      )}
      {erreurs.commentaire && <p className={`mt-2 ${erreurTexte}`}>{erreurs.commentaire}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {commentaires.map((c, i) => (
          <div key={c.id_commentaire} className="flex items-start gap-4 rounded-[24px] border border-border bg-card p-5">
            <PastilleInitiale prenom={c.utilisateur.prenom} teinte={i % 2 === 0 ? 'claire' : 'ambre'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-bold text-foreground">{c.utilisateur.prenom}</span>
                <span className="text-sm text-muted-foreground">{formaterDateRelative(c.date_creation)}</span>
                {utilisateurConnecte && utilisateurConnecte.id_utilisateur === c.id_utilisateur && (
                  <button
                    type="button"
                    onClick={() => supprimer(c.id_commentaire)}
                    disabled={enCours.listeCommentaires}
                    className="ml-auto inline-flex min-h-11 items-center bg-transparent p-0 font-sans text-sm font-bold text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t('commentaires.supprimer')}
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line break-words text-[17px] leading-[1.6] text-[#45524F]">{c.description}</p>
            </div>
          </div>
        ))}
        {commentaires.length === 0 && <p className="text-[17px] text-muted-foreground">{t('commentaires.vide')}</p>}
      </div>

      {infos.page < infos.pages && (
        <Button variant="outline" onClick={onVoirPlus} className="mt-6" disabled={enCours.listeCommentaires}>
          {enCours.listeCommentaires ? t('commun:chargementPoints') : t('commentaires.voirPlus')}
        </Button>
      )}
      {erreurs.listeCommentaires && <p className={`mt-2 ${erreurTexte}`}>{erreurs.listeCommentaires}</p>}
    </div>
  );
}
