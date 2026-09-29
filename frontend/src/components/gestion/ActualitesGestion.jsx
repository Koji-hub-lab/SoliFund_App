import { useState } from 'react';
import { Button } from '../ui/Button';
import api from '../../api/axios';
import { formaterDateHeure } from '../../utils/format';
import { champPilule, champZone, erreurTexte, titreSection } from '../cagnotte/classes';

export default function ActualitesGestion({ idCagnotte, actualites, executer, charger, enCours, erreurs }) {
  const [nouvelle, setNouvelle] = useState({ titre: '', contenu: '' });

  function publier(e) {
    e.preventDefault();
    return executer('actualite', async () => {
      await api.post('/actualites', { id_cagnotte: Number(idCagnotte), ...nouvelle });
      setNouvelle({ titre: '', contenu: '' });
      charger();
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-[28px] border border-border bg-card p-6 sm:p-7">
        <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">Publier une actualité</h2>
        <p className="mt-1 text-sm text-muted-foreground">Donnez des nouvelles à vos donateurs : elles s'affichent sur la page publique.</p>
        <form onSubmit={publier} className="mt-5 flex flex-col gap-3">
          <input
            aria-label="Titre de l'actualité"
            placeholder="Titre de l'actualité"
            value={nouvelle.titre}
            onChange={(e) => setNouvelle({ ...nouvelle, titre: e.target.value })}
            required
            className={champPilule}
          />
          <textarea
            aria-label="Contenu de l'actualité"
            placeholder="Contenu"
            rows={5}
            value={nouvelle.contenu}
            onChange={(e) => setNouvelle({ ...nouvelle, contenu: e.target.value })}
            required
            className={champZone}
          />
          <Button type="submit" disabled={enCours.actualite} className="w-full">
            {enCours.actualite ? 'Publication...' : 'Publier'}
          </Button>
          {erreurs.actualite && <p className={erreurTexte}>{erreurs.actualite}</p>}
        </form>
      </section>

      <section>
        <h2 className={titreSection}>Actualités publiées ({actualites.length})</h2>
        {actualites.length === 0 ? (
          <p className="mt-4 text-base text-muted-foreground">Aucune actualité pour le moment.</p>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            {actualites.map((a) => (
              <article key={a.id_actualite} className="rounded-[24px] border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">{formaterDateHeure(a.date_publication)}</p>
                <h3 className="mt-1 font-display text-xl font-bold text-foreground">{a.titre}</h3>
                <p className="mt-2 whitespace-pre-line break-words text-[17px] leading-[1.6] text-[#45524F]">{a.contenu}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
