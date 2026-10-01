import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, FiltresPilules, RecherchePilule, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Confirmation from '../../components/ui/Confirmation';
import { nomOperateur } from '../../components/cagnotte/ChoixOperateur';
import api from '../../api/axios';
import { chargerToutesLesPages } from '../../api/pagination';
import { formaterMontant, formaterDateHeure } from '../../utils/format';
import { formaterTaux } from '../../utils/commission';
import { BadgeStatut, statutsRetrait } from '../../utils/statuts';
import { SqueletteListe } from '../../components/ui/Squelette';

const FILTRES = ['EN_ATTENTE', 'APPROUVE', 'ECHOUE', 'TRAITE', 'REJETE', 'TOUS'];
// Libellé du montant net selon le statut du retrait.
const CLES_NET = { EN_ATTENTE: 'retraits.aVerser', APPROUVE: 'retraits.aVerser', ECHOUE: 'retraits.aVerser', TRAITE: 'retraits.verse' };

export default function AdminRetraits() {
  const { t } = useTranslation('admin');
  const [retraits, setRetraits] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('EN_ATTENTE');
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState('');
  // Action à confirmer : { type: 'verser' | 'rejeter', retrait }. « verser » couvre « Approuver et
  // verser » (retrait en attente) et « Relancer le versement » (versement échoué).
  const [aConfirmer, setAConfirmer] = useState(null);
  // Mode manuel de secours : la somme a été versée hors plateforme, rien n'est envoyé au fournisseur de paiement.
  const [horsPlateforme, setHorsPlateforme] = useState(false);

  function demander(type, retrait) {
    setHorsPlateforme(false);
    setAConfirmer({ type, retrait });
  }

  function charger() {
    setChargement(true);
    setErreur('');
    return chargerToutesLesPages('/retraits', filtre === 'TOUS' ? {} : { statut: filtre })
      .then((res) => setRetraits(res.donnees))
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, [filtre]);

  async function confirmer(motif) {
    const { type, retrait } = aConfirmer;
    try {
      if (type === 'rejeter') await api.post(`/retraits/${retrait.id_retrait}/rejeter`, { motif_rejet: motif || undefined });
      else if (horsPlateforme) await api.post(`/retraits/${retrait.id_retrait}/traiter`, { hors_plateforme: true });
      else await api.post(`/retraits/${retrait.id_retrait}/verser`);
    } catch (err) {
      // Un versement refusé change quand même le statut du retrait (échoué) : la liste est rechargée.
      charger();
      throw err;
    }
    setAConfirmer(null);
    await charger();
  }

  // Recherche dans la liste chargée (cagnotte, organisateur, email).
  const terme = recherche.trim().toLowerCase();
  const affiches = terme
    ? retraits.filter((r) =>
        [r.cagnotte.titre, r.utilisateur.prenom, r.utilisateur.nom, r.utilisateur.email].join(' ').toLowerCase().includes(terme),
      )
    : retraits;

  // Dans les confirmations : le net (à verser) pour un traitement, le brut (demandé) pour un rejet.
  const devise = aConfirmer?.retrait.cagnotte.devise;
  const net = aConfirmer ? formaterMontant(aConfirmer.retrait.montant_net, devise) : '';
  const brut = aConfirmer ? formaterMontant(aConfirmer.retrait.montant_brut, devise) : '';
  const filtres = FILTRES.map((valeur) => ({ valeur, libelle: t(`retraits.filtres.${valeur}`) }));

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin titre={t('retraits.titre')} sousTitre={t('retraits.sousTitre')} />

        <RecherchePilule
          valeur={recherche}
          onChange={setRecherche}
          placeholder={t('retraits.rechercherPlaceholder')}
          libelle={t('retraits.rechercher')}
        />
        <FiltresPilules filtres={filtres} actif={filtre} onChanger={setFiltre} />

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {chargement && retraits.length === 0 && <SqueletteListe lignes={4} />}

        {!(chargement && retraits.length === 0) && (
          <CarteListe vide={affiches.length === 0} messageVide={t('retraits.vide')}>
            {affiches.map((r) => (
              <li key={r.id_retrait} className={classeLigne}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
                      {t(CLES_NET[r.statut] ?? 'retraits.net', { montant: formaterMontant(r.montant_net, r.cagnotte.devise) })}
                    </p>
                    <BadgeStatut statuts={statutsRetrait} statut={r.statut} />
                  </div>
                  <p className="font-bold text-foreground">
                    {nomOperateur(r.methode_retrait)} · {r.numero_beneficiaire}
                  </p>
                  <p className="text-sm text-[#45524F]">
                    {Number(r.montant_commission) > 0
                      ? t('retraits.demande', {
                          brut: formaterMontant(r.montant_brut, r.cagnotte.devise),
                          taux: formaterTaux(r.taux_commission),
                          commission: formaterMontant(r.montant_commission, r.cagnotte.devise),
                        })
                      : t('retraits.demandeSansCommission', { brut: formaterMontant(r.montant_brut, r.cagnotte.devise) })}
                  </p>
                  <p className="mt-2 font-bold text-foreground">{r.cagnotte.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('retraits.demandePar', { nom: `${r.utilisateur.prenom} ${r.utilisateur.nom}`, email: r.utilisateur.email })}
                  </p>
                  <p className="text-sm text-muted-foreground">{formaterDateHeure(r.date_creation)}</p>
                  {r.motif_rejet && <p className="mt-1 text-sm text-destructive">{t('retraits.motifRejet', { motif: r.motif_rejet })}</p>}
                  {r.statut === 'ECHOUE' && (
                    <p className="mt-1 text-sm text-destructive">{t('retraits.echec', { raison: r.message_erreur || r.code_erreur || t('retraits.echecInconnu') })}</p>
                  )}
                  {r.statut === 'APPROUVE' && <p className="mt-1 text-sm text-[#45524F]">{t('retraits.enCours')}</p>}
                  {r.hors_plateforme && <p className="mt-1 text-sm text-[#45524F]">{t('retraits.verseHorsPlateforme')}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" to={`/cagnottes/${r.id_cagnotte}`}>{t('commun:actions.voir')}</Button>
                  {r.statut === 'EN_ATTENTE' && (
                    <>
                      <Button size="sm" onClick={() => demander('verser', r)}>{t('retraits.approuver')}</Button>
                      <Button size="sm" variant="danger" onClick={() => demander('rejeter', r)}>{t('retraits.rejeter')}</Button>
                    </>
                  )}
                  {r.statut === 'ECHOUE' && (
                    <>
                      <Button size="sm" onClick={() => demander('verser', r)}>{t('retraits.relancer')}</Button>
                      <Button size="sm" variant="danger" onClick={() => demander('rejeter', r)}>{t('retraits.rejeter')}</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </CarteListe>
        )}
      </div>

      <Confirmation
        ouvert={!!aConfirmer}
        titre={
          aConfirmer?.type === 'rejeter'
            ? t('retraits.rejeterTitre')
            : aConfirmer?.retrait.statut === 'ECHOUE'
              ? t('retraits.relancerTitre')
              : t('retraits.approuverTitre')
        }
        message={
          aConfirmer?.type === 'rejeter'
            ? t('retraits.rejeterMessage', { brut })
            : t(horsPlateforme ? 'retraits.horsPlateformeMessage' : 'retraits.approuverMessage', {
                net,
                numero: aConfirmer?.retrait.numero_beneficiaire,
                operateur: nomOperateur(aConfirmer?.retrait.methode_retrait),
              })
        }
        libelleConfirmer={
          aConfirmer?.type === 'rejeter'
            ? t('retraits.rejeterLibelle')
            : horsPlateforme
              ? t('retraits.marquer')
              : aConfirmer?.retrait.statut === 'ECHOUE'
                ? t('retraits.relancer')
                : t('retraits.approuver')
        }
        variante={aConfirmer?.type === 'rejeter' ? 'danger' : 'default'}
        motif={aConfirmer?.type === 'rejeter' ? { libelle: t('retraits.motif'), obligatoire: false, placeholder: t('retraits.motifPlaceholder') } : undefined}
        onConfirmer={confirmer}
        onAnnuler={() => setAConfirmer(null)}
      >
        {aConfirmer?.type === 'verser' && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px] leading-[1.6] text-foreground">
            <input
              type="checkbox"
              checked={horsPlateforme}
              onChange={(e) => setHorsPlateforme(e.target.checked)}
              className="mt-1 size-5 shrink-0 cursor-pointer p-0 accent-primary"
            />
            {t('retraits.horsPlateforme')}
          </label>
        )}
      </Confirmation>
    </AdminLayout>
  );
}
