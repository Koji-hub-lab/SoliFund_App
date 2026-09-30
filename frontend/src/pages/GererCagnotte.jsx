import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import OngletsCagnotte from '../components/cagnotte/OngletsCagnotte';
import EnTeteGestion from '../components/gestion/EnTeteGestion';
import ApercuGestion from '../components/gestion/ApercuGestion';
import RetraitsGestion from '../components/gestion/RetraitsGestion';
import ActualitesGestion from '../components/gestion/ActualitesGestion';
import PhotoGestion from '../components/gestion/PhotoGestion';
import api from '../api/axios';
import { SqueletteChiffres, SqueletteEnTete, SqueletteListe } from '../components/ui/Squelette';

const ONGLETS = ['apercu', 'retraits', 'actualites', 'photo'];

// Page de gestion d'une cagnotte, réservée à son propriétaire.
export default function GererCagnotte() {
  const { id } = useParams();
  const { t } = useTranslation('tableau-de-bord');
  const [params, setParams] = useSearchParams();
  const onglet = ONGLETS.includes(params.get('onglet')) ? params.get('onglet') : 'apercu';

  const [cagnotte, setCagnotte] = useState(null);
  const [nonProprietaire, setNonProprietaire] = useState(false);
  const [dons, setDons] = useState([]);
  const [infosDons, setInfosDons] = useState({ total: 0, page: 1, pages: 1 });
  const [retraits, setRetraits] = useState([]);
  const [actualites, setActualites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState({});
  const [erreurs, setErreurs] = useState({});

  // Exécute une action : bloque les doubles clics, affiche l'erreur éventuelle sous la zone `zone`.
  async function executer(zone, action) {
    if (enCours[zone]) return;
    setEnCours((z) => ({ ...z, [zone]: true }));
    setErreurs((e) => ({ ...e, [zone]: '' }));
    try {
      await action();
    } catch (err) {
      setErreurs((e) => ({ ...e, [zone]: err.messageAffichable }));
    } finally {
      setEnCours((z) => ({ ...z, [zone]: false }));
    }
  }

  // GET /cagnottes/mes fournit nb_donateurs et montant_disponible, et sert de contrôle de propriété.
  function charger() {
    setErreur('');
    return api.get('/cagnottes/mes')
      .then(async (res) => {
        const trouvee = res.data.find((c) => c.id_cagnotte === Number(id));
        if (!trouvee) {
          setNonProprietaire(true);
          return;
        }
        const [resDons, resRetraits, resActualites] = await Promise.all([
          api.get(`/dons/cagnotte/${id}`),
          api.get(`/retraits/cagnotte/${id}`),
          api.get(`/actualites/cagnotte/${id}`),
        ]);
        setCagnotte(trouvee);
        setDons(resDons.data.donnees);
        setInfosDons(resDons.data);
        setRetraits(resRetraits.data);
        setActualites(resActualites.data);
      })
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, [id]);

  function voirPlusDons() {
    return executer('listeDons', async () => {
      const res = await api.get(`/dons/cagnotte/${id}`, { params: { page: infosDons.page + 1 } });
      setDons((actuels) => [...actuels, ...res.data.donnees]);
      setInfosDons(res.data);
    });
  }

  function changerOnglet(nouvel) {
    setParams(nouvel === 'apercu' ? {} : { onglet: nouvel }, { replace: true });
  }

  if (nonProprietaire) return <Navigate to="/mes-cagnottes" replace />;

  const propsActions = { executer, charger, enCours, erreurs };
  const onglets = [
    { id: 'apercu', libelle: t('gestion.onglets.apercu') },
    { id: 'retraits', libelle: t('gestion.onglets.retraits'), compteur: retraits.length },
    { id: 'actualites', libelle: t('gestion.onglets.actualites'), compteur: actualites.length },
    { id: 'photo', libelle: t('gestion.onglets.photo') },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {chargement && (
          <div className="flex flex-col gap-8">
            <SqueletteEnTete />
            <SqueletteChiffres nombre={3} />
            <SqueletteListe lignes={3} />
          </div>
        )}
        {erreur && <p className="text-sm text-destructive">{erreur}</p>}

        {cagnotte && (
          <>
            <EnTeteGestion cagnotte={cagnotte} />
            <OngletsCagnotte onglets={onglets} actif={onglet} onChanger={changerOnglet} />
            <div role="tabpanel" id={`panneau-${onglet}`} aria-labelledby={`onglet-${onglet}`}>
              {onglet === 'apercu' && (
                <ApercuGestion
                  cagnotte={cagnotte}
                  dons={dons}
                  infosDons={infosDons}
                  onVoirPlus={voirPlusDons}
                  enCours={enCours.listeDons}
                  erreur={erreurs.listeDons}
                />
              )}
              {onglet === 'retraits' && <RetraitsGestion cagnotte={cagnotte} retraits={retraits} {...propsActions} />}
              {onglet === 'actualites' && <ActualitesGestion idCagnotte={id} actualites={actualites} {...propsActions} />}
              {onglet === 'photo' && <PhotoGestion cagnotte={cagnotte} {...propsActions} />}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
