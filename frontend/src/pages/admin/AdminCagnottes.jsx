import { Trans, useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, FiltresPilules, RecherchePilule, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Confirmation from '../../components/ui/Confirmation';
import api from '../../api/axios';
import { formaterMontant, formaterDate } from '../../utils/format';
import { BadgeStatut, libelleRaisonVerification, statutsCagnotte, statutsIdentite } from '../../utils/statuts';
import { SqueletteListe } from '../../components/ui/Squelette';

// « À valider » en premier : ce sont les cagnottes qui attendent une décision.
const FILTRES = ['EN_VERIFICATION', 'ACTIVE', 'SUSPENDUE', 'REFUSEE', 'TERMINEE', 'ANNULEE', 'TOUTES'];

export default function AdminCagnottes() {
  const { t } = useTranslation('admin');
  const [cagnottes, setCagnottes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('EN_VERIFICATION');
  const [recherche, setRecherche] = useState('');
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  // Réactivation en cours et erreurs ({ chargement | id_cagnotte: message }).
  const [enCours, setEnCours] = useState(null);
  const [erreurs, setErreurs] = useState({});
  // Action à confirmer avec un motif obligatoire : { type: 'suspendre' | 'refuser', cagnotte }.
  const [aConfirmer, setAConfirmer] = useState(null);
  const derniereRequete = useRef(0);

  // Seule la réponse de la dernière requête est prise en compte (filtres changés rapidement).
  function charger() {
    const numero = ++derniereRequete.current;
    setChargement(true);
    setErreurs((e) => ({ ...e, chargement: '' }));
    const params = { page };
    if (filtre !== 'TOUTES') params.statut = filtre;
    if (rechercheEnvoyee) params.recherche = rechercheEnvoyee;
    return api.get('/admin/cagnottes', { params })
      .then((res) => {
        if (numero !== derniereRequete.current) return;
        setCagnottes(res.data.donnees);
        setPages(res.data.pages);
      })
      .catch((err) => numero === derniereRequete.current && setErreurs((e) => ({ ...e, chargement: err.messageAffichable })))
      .finally(() => numero === derniereRequete.current && setChargement(false));
  }

  useEffect(() => {
    charger();
  }, [filtre, page, rechercheEnvoyee]);

  // La recherche part 300 ms après la dernière frappe.
  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheEnvoyee(recherche.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  function changerFiltre(f) {
    setFiltre(f);
    setPage(1);
  }

  function changerPage(nouvellePage) {
    setPage(nouvellePage);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  async function reactiver(id) {
    if (enCours) return;
    setEnCours(id);
    setErreurs((e) => ({ ...e, [id]: '' }));
    try {
      await api.patch(`/admin/cagnottes/${id}/statut`, { statut: 'ACTIVE' });
      await charger();
    } catch (err) {
      setErreurs((e) => ({ ...e, [id]: err.messageAffichable }));
    } finally {
      setEnCours(null);
    }
  }

  async function approuver(id) {
    if (enCours) return;
    setEnCours(id);
    setErreurs((e) => ({ ...e, [id]: '' }));
    try {
      await api.post(`/admin/cagnottes/${id}/approuver`);
      await charger();
    } catch (err) {
      setErreurs((e) => ({ ...e, [id]: err.messageAffichable }));
    } finally {
      setEnCours(null);
    }
  }

  async function confirmer(motif) {
    const { type, cagnotte } = aConfirmer;
    if (type === 'suspendre') {
      await api.patch(`/admin/cagnottes/${cagnotte.id_cagnotte}/statut`, { statut: 'SUSPENDUE', motif });
    } else {
      await api.post(`/admin/cagnottes/${cagnotte.id_cagnotte}/refuser`, { motif });
    }
    setAConfirmer(null);
    await charger();
  }

  // Textes de la confirmation en cours (« suspendre » ou « refuser »), avec son motif obligatoire.
  const cleConf = aConfirmer ? `cagnottes.confirmations.${aConfirmer.type}` : null;
  const filtres = FILTRES.map((valeur) => ({ valeur, libelle: t(`cagnottes.filtres.${valeur}`) }));

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin titre={t('cagnottes.titre')} sousTitre={t('cagnottes.sousTitre')} />

        <RecherchePilule valeur={recherche} onChange={setRecherche} placeholder={t('cagnottes.rechercherPlaceholder')} libelle={t('cagnottes.rechercher')} />
        <FiltresPilules filtres={filtres} actif={filtre} onChanger={changerFiltre} />

        {erreurs.chargement && <p className="text-sm text-destructive">{erreurs.chargement}</p>}
        {chargement && cagnottes.length === 0 && <SqueletteListe lignes={4} />}

        {!(chargement && cagnottes.length === 0) && (
          <CarteListe vide={cagnottes.length === 0} messageVide={t('cagnottes.vide')}>
            {cagnottes.map((c) => (
              <li key={c.id_cagnotte} className={classeLigne}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl font-bold text-foreground">{c.titre}</p>
                    <BadgeStatut statuts={statutsCagnotte} statut={c.statut} />
                    {!c.est_publique && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">{t('cagnottes.privee')}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t('cagnottes.organiseePar', { nom: `${c.utilisateur.prenom} ${c.utilisateur.nom}`, email: c.utilisateur.email })}
                    </p>
                    <BadgeStatut statuts={statutsIdentite} statut={c.identite_statut} />
                  </div>
                  {c.statut === 'EN_VERIFICATION' && (
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {t('cagnottes.aVerifier', { raisons: (c.raisons_verification ?? []).map(libelleRaisonVerification).join(' · ') || t('cagnottes.raisonNonPrecisee') })}
                    </p>
                  )}
                  {c.statut === 'REFUSEE' && c.motif_refus && (
                    <p className="mt-1 text-sm text-[#45524F]">{t('cagnottes.motifRefus', { motif: c.motif_refus })}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <Trans
                      t={t}
                      i18nKey="cagnottes.resume"
                      values={{
                        collecte: formaterMontant(c.montant_collecte, c.devise),
                        objectif: formaterMontant(c.objectif, c.devise),
                        categorie: c.categorie?.nom || t('cagnottes.sansCategorie'),
                        debut: formaterDate(c.date_debut),
                        fin: formaterDate(c.date_fin),
                      }}
                      components={{ b: <strong className="text-foreground" /> }}
                    />
                  </p>
                  {erreurs[c.id_cagnotte] && <p className="mt-1 text-sm text-destructive">{erreurs[c.id_cagnotte]}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" to={`/cagnottes/${c.id_cagnotte}`}>{t('commun:actions.voir')}</Button>
                  {c.statut === 'EN_VERIFICATION' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approuver(c.id_cagnotte)}
                        disabled={enCours !== null || c.identite_statut !== 'VALIDEE'}
                        title={c.identite_statut !== 'VALIDEE' ? t('cagnottes.identiteRequise') : undefined}
                      >
                        {enCours === c.id_cagnotte ? t('commun:actions.envoiEnCours') : t('cagnottes.approuver')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setAConfirmer({ type: 'refuser', cagnotte: c })} disabled={enCours !== null}>
                        {t('cagnottes.refuser')}
                      </Button>
                    </>
                  )}
                  {c.statut === 'ACTIVE' && (
                    <Button size="sm" variant="danger" onClick={() => setAConfirmer({ type: 'suspendre', cagnotte: c })} disabled={enCours !== null}>{t('cagnottes.suspendre')}</Button>
                  )}
                  {c.statut === 'SUSPENDUE' && (
                    <Button size="sm" onClick={() => reactiver(c.id_cagnotte)} disabled={enCours !== null}>
                      {enCours === c.id_cagnotte ? t('commun:actions.envoiEnCours') : t('cagnottes.reactiver')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </CarteListe>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => changerPage(page - 1)}>{t('commun:actions.precedent')}</Button>
            <p className="text-sm text-muted-foreground">{t('commun:actions.pagination', { page, pages })}</p>
            <Button variant="outline" disabled={page >= pages} onClick={() => changerPage(page + 1)}>{t('commun:actions.suivant')}</Button>
          </div>
        )}
      </div>

      <Confirmation
        ouvert={!!aConfirmer}
        titre={cleConf ? t(`${cleConf}.titre`) : ''}
        message={cleConf ? t(`${cleConf}.message`, { titre: aConfirmer.cagnotte.titre }) : ''}
        libelleConfirmer={cleConf ? t(`${cleConf}.libelle`) : undefined}
        motif={
          cleConf
            ? { libelle: t(`${cleConf}.motif`), obligatoire: true, placeholder: t(`${cleConf}.placeholder`) }
            : { libelle: t('cagnottes.motif'), obligatoire: true }
        }
        onConfirmer={confirmer}
        onAnnuler={() => setAConfirmer(null)}
      />
    </AdminLayout>
  );
}
