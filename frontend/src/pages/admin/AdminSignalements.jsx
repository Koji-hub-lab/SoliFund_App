import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Confirmation from '../../components/ui/Confirmation';
import { SqueletteListe } from '../../components/ui/Squelette';
import api from '../../api/axios';
import { chargerToutesLesPages } from '../../api/pagination';
import { formaterDate } from '../../utils/format';
import { BadgeStatut, libelleMotifSignalement, statutsCagnotte } from '../../utils/statuts';

// Regroupe les signalements ouverts par cagnotte : nombre, motifs (avec leur nombre), commentaires.
function regrouper(signalements) {
  const groupes = new Map();
  for (const s of signalements) {
    const id = s.cagnotte.id_cagnotte;
    if (!groupes.has(id)) {
      groupes.set(id, { cagnotte: s.cagnotte, nombre: 0, motifs: {}, commentaires: [], dernier: s.date });
    }
    const g = groupes.get(id);
    g.nombre += 1;
    g.motifs[s.motif] = (g.motifs[s.motif] ?? 0) + 1;
    if (s.commentaire) g.commentaires.push(s.commentaire);
    if (s.date > g.dernier) g.dernier = s.date;
  }
  // Les cagnottes les plus signalées d'abord.
  return [...groupes.values()].sort((a, b) => b.nombre - a.nombre);
}

// Seule la suspension est une action sensible (bouton rouge, motif obligatoire).
const VARIANTES = { classer: 'default', suspendre: 'danger', reactiver: 'default' };

export default function AdminSignalements() {
  const { t } = useTranslation('admin');
  const [groupes, setGroupes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  // Action à confirmer : { type: 'classer' | 'suspendre' | 'reactiver', cagnotte }.
  const [aConfirmer, setAConfirmer] = useState(null);

  function charger() {
    setErreur('');
    return chargerToutesLesPages('/admin/signalements', { statut: 'OUVERT' })
      .then((res) => setGroupes(regrouper(res.donnees)))
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function confirmer(motif) {
    const { type, cagnotte } = aConfirmer;
    if (type === 'classer') {
      await api.post(`/admin/signalements/cagnottes/${cagnotte.id_cagnotte}/classer`);
    } else if (type === 'suspendre') {
      await api.patch(`/admin/cagnottes/${cagnotte.id_cagnotte}/statut`, { statut: 'SUSPENDUE', motif });
    } else {
      // La réactivation classe les signalements ouverts de la cagnotte.
      await api.patch(`/admin/cagnottes/${cagnotte.id_cagnotte}/statut`, { statut: 'ACTIVE' });
    }
    setAConfirmer(null);
    await charger();
  }

  const cleConf = aConfirmer ? `signalements.confirmations.${aConfirmer.type}` : null;
  const total = groupes.reduce((n, g) => n + g.nombre, 0);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin
          titre={t('signalements.titre')}
          sousTitre={
            chargement
              ? t('signalements.sousTitreChargement')
              : `${t('signalements.signalements', { count: total })} ${t('signalements.surCagnottes', { count: groupes.length })}`
          }
        />

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {chargement ? (
          <SqueletteListe lignes={3} />
        ) : (
          <CarteListe vide={groupes.length === 0} messageVide={t('signalements.vide')}>
            {groupes.map((g) => {
              const c = g.cagnotte;
              return (
                <li key={c.id_cagnotte} className={classeLigne}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl font-bold text-foreground">{c.titre}</p>
                      <BadgeStatut statuts={statutsCagnotte} statut={c.statut} />
                      <span className="rounded-full bg-encre px-3 py-1 text-xs font-bold text-primary-foreground">
                        {t('signalements.nombre', { count: g.nombre })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {Object.entries(g.motifs)
                        .map(([motif, n]) => `${libelleMotifSignalement(motif)}${n > 1 ? ` × ${n}` : ''}`)
                        .join(' · ')}
                      {' · '}{t('signalements.dernier', { date: formaterDate(g.dernier) })}
                    </p>
                    {g.commentaires.length > 0 && (
                      <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                        {g.commentaires.map((commentaire, i) => (
                          <li key={i} className="text-sm leading-[1.6] text-[#45524F]">« {commentaire} »</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" to={`/cagnottes/${c.id_cagnotte}`}>{t('commun:actions.voir')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setAConfirmer({ type: 'classer', cagnotte: c })}>
                      {t('signalements.classer')}
                    </Button>
                    {c.statut === 'ACTIVE' && (
                      <Button size="sm" variant="danger" onClick={() => setAConfirmer({ type: 'suspendre', cagnotte: c })}>
                        {t('signalements.suspendre')}
                      </Button>
                    )}
                    {c.statut === 'SUSPENDUE' && (
                      <Button size="sm" onClick={() => setAConfirmer({ type: 'reactiver', cagnotte: c })}>
                        {t('signalements.reactiver')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </CarteListe>
        )}
      </div>

      <Confirmation
        ouvert={!!aConfirmer}
        titre={cleConf ? t(`${cleConf}.titre`) : ''}
        message={cleConf ? t(`${cleConf}.message`, { titre: aConfirmer.cagnotte.titre }) : ''}
        libelleConfirmer={cleConf ? t(`${cleConf}.libelle`) : undefined}
        variante={aConfirmer ? VARIANTES[aConfirmer.type] : undefined}
        motif={
          aConfirmer?.type === 'suspendre'
            ? { libelle: t(`${cleConf}.motif`), obligatoire: true, placeholder: t(`${cleConf}.placeholder`) }
            : undefined
        }
        onConfirmer={confirmer}
        onAnnuler={() => setAConfirmer(null)}
      />
    </AdminLayout>
  );
}
