import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, FiltresPilules } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Confirmation from '../../components/ui/Confirmation';
import { Bloc, SqueletteListe } from '../../components/ui/Squelette';
import { nomOperateur } from '../../components/cagnotte/ChoixOperateur';
import api from '../../api/axios';
import { chargerToutesLesPages } from '../../api/pagination';
import { formaterDate } from '../../utils/format';
import { BadgeStatut, statutsIdentite } from '../../utils/statuts';

const FILTRES = ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'TOUTES'];
const VARIANTES = { valider: 'default', refuser: 'danger', revoquer: 'danger' };

// Document d'identité : lu avec le jeton de l'administrateur (la route est protégée), puis affiché
// depuis la mémoire du navigateur. Chaque consultation est journalisée par le backend.
function DocumentIdentite({ idVerification, nom, libelle }) {
  const { t } = useTranslation('admin');
  const [url, setUrl] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let actif = true;
    let adresse = null;
    api.get(`/admin/verifications-identite/${idVerification}/fichiers/${nom}`, { responseType: 'blob' })
      .then((res) => {
        adresse = URL.createObjectURL(res.data);
        if (actif) setUrl(adresse);
        else URL.revokeObjectURL(adresse);
      })
      .catch(() => actif && setErreur(t('verifications.fichierErreur')));
    return () => {
      actif = false;
      if (adresse) URL.revokeObjectURL(adresse);
    };
  }, [idVerification, nom, t]);

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-bold text-foreground">{libelle}</figcaption>
      {erreur ? (
        <p className="text-sm text-destructive">{erreur}</p>
      ) : url ? (
        <a href={url} target="_blank" rel="noopener" className="block overflow-hidden rounded-[20px] border border-border">
          <img src={url} alt={libelle} className="aspect-[4/3] w-full bg-background object-contain" />
        </a>
      ) : (
        <Bloc className="aspect-[4/3] w-full rounded-[20px]" />
      )}
    </figure>
  );
}

function Detail({ verification }) {
  const { t } = useTranslation('admin');
  const { t: tIdentite } = useTranslation('identite');
  const v = verification;
  const lignes = [
    [t('verifications.piece'), tIdentite(`formulaire.types.${v.type_piece}`)],
    [t('verifications.numeroPiece'), v.numero_piece],
    [t('verifications.dateNaissance'), formaterDate(v.date_naissance)],
    [t('verifications.dateExpiration'), v.date_expiration ? formaterDate(v.date_expiration) : t('verifications.sansExpiration')],
    [t('verifications.retrait'), `${nomOperateur(v.methode_retrait)} · +237 ${v.telephone_retrait}`],
    [t('verifications.compte'), `${v.utilisateur.prenom} ${v.utilisateur.nom} · ${v.utilisateur.email}`],
  ];
  if (v.motif_refus) lignes.push([t('verifications.motifRefus'), v.motif_refus]);

  return (
    <div className="mt-4 flex flex-col gap-5">
      <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {lignes.map(([libelle, valeur]) => (
          <div key={libelle} className="contents">
            <dt className="font-bold text-foreground">{libelle}</dt>
            <dd className="m-0 text-[#45524F]">{valeur}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {['recto', 'verso', 'selfie'].map((nom) =>
          v.fichiers[nom] ? (
            <DocumentIdentite key={nom} idVerification={v.id_verification} nom={nom} libelle={t(`verifications.fichiers.${nom}`)} />
          ) : (
            <div key={nom}>
              <p className="mb-2 text-sm font-bold text-foreground">{t(`verifications.fichiers.${nom}`)}</p>
              <p className="text-sm text-muted-foreground">{t('verifications.fichierAbsent')}</p>
            </div>
          ),
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t('verifications.consultationJournalisee')}</p>
    </div>
  );
}

export default function AdminVerifications() {
  const { t } = useTranslation('admin');
  const [filtre, setFiltre] = useState('EN_ATTENTE');
  const [verifications, setVerifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [ouverte, setOuverte] = useState(null);
  // Action à confirmer : { type: 'valider' | 'refuser' | 'revoquer', verification }.
  const [aConfirmer, setAConfirmer] = useState(null);

  function charger(statut = filtre) {
    setErreur('');
    return chargerToutesLesPages('/admin/verifications-identite', statut === 'TOUTES' ? {} : { statut })
      .then((res) => setVerifications(res.donnees))
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function changerFiltre(valeur) {
    setFiltre(valeur);
    setOuverte(null);
    setChargement(true);
    charger(valeur);
  }

  async function confirmer(motif) {
    const { type, verification } = aConfirmer;
    const base = `/admin/verifications-identite/${verification.id_verification}`;
    if (type === 'valider') await api.post(`${base}/valider`);
    else await api.post(`${base}/refuser`, { motif });
    setAConfirmer(null);
    await charger();
  }

  const cleConf = aConfirmer ? `verifications.confirmations.${aConfirmer.type}` : null;
  const nomConf = aConfirmer ? `${aConfirmer.verification.prenoms} ${aConfirmer.verification.nom}` : '';

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin
          titre={t('verifications.titre')}
          sousTitre={chargement ? t('verifications.sousTitreChargement') : t('verifications.sousTitre', { count: verifications.length })}
        />
        <FiltresPilules
          filtres={FILTRES.map((valeur) => ({ valeur, libelle: t(`verifications.filtres.${valeur}`) }))}
          actif={filtre}
          onChanger={changerFiltre}
        />

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {chargement ? (
          <SqueletteListe lignes={3} />
        ) : (
          <CarteListe vide={verifications.length === 0} messageVide={t('verifications.vide')}>
            {verifications.map((v) => {
              const estOuverte = ouverte === v.id_verification;
              return (
                <li key={v.id_verification} className="py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-xl font-bold text-foreground">{v.prenoms} {v.nom}</p>
                        <BadgeStatut statuts={statutsIdentite} statut={v.statut} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {v.utilisateur.email} · {t('verifications.soumiseLe', { date: formaterDate(v.date_soumission) })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="outline" aria-expanded={estOuverte} onClick={() => setOuverte(estOuverte ? null : v.id_verification)}>
                        {estOuverte ? t('verifications.masquer') : t('verifications.examiner')}
                      </Button>
                      {v.statut === 'EN_ATTENTE' && (
                        <>
                          <Button size="sm" onClick={() => setAConfirmer({ type: 'valider', verification: v })}>
                            {t('verifications.valider')}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setAConfirmer({ type: 'refuser', verification: v })}>
                            {t('verifications.refuser')}
                          </Button>
                        </>
                      )}
                      {v.statut === 'VALIDEE' && (
                        <Button size="sm" variant="danger" onClick={() => setAConfirmer({ type: 'revoquer', verification: v })}>
                          {t('verifications.revoquer')}
                        </Button>
                      )}
                    </div>
                  </div>
                  {estOuverte && <Detail verification={v} />}
                </li>
              );
            })}
          </CarteListe>
        )}
      </div>

      <Confirmation
        ouvert={!!aConfirmer}
        titre={cleConf ? t(`${cleConf}.titre`) : ''}
        message={cleConf ? t(`${cleConf}.message`, { nom: nomConf, telephone: aConfirmer.verification.telephone_retrait }) : ''}
        libelleConfirmer={cleConf ? t(`${cleConf}.libelle`) : undefined}
        variante={aConfirmer ? VARIANTES[aConfirmer.type] : undefined}
        motif={
          aConfirmer && aConfirmer.type !== 'valider'
            ? { libelle: t(`${cleConf}.motif`), obligatoire: true, placeholder: t(`${cleConf}.placeholder`) }
            : undefined
        }
        onConfirmer={confirmer}
        onAnnuler={() => setAConfirmer(null)}
      />
    </AdminLayout>
  );
}
