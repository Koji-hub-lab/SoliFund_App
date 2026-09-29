import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '../components/site/SiteHeader';
import { SiteFooter } from '../components/site/SiteFooter';
import { Button } from '../components/ui/Button';
import PhotoCagnotte from '../components/cagnotte/PhotoCagnotte';
import EnTeteCagnotte from '../components/cagnotte/EnTeteCagnotte';
import OngletsCagnotte from '../components/cagnotte/OngletsCagnotte';
import HistoireCagnotte from '../components/cagnotte/HistoireCagnotte';
import ActualitesCagnotte from '../components/cagnotte/ActualitesCagnotte';
import CommentairesCagnotte from '../components/cagnotte/CommentairesCagnotte';
import CarteMontant from '../components/cagnotte/CarteMontant';
import FormulaireDon from '../components/cagnotte/FormulaireDon';
import DerniersDons from '../components/cagnotte/DerniersDons';
import PartageCagnotte from '../components/cagnotte/PartageCagnotte';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { SqueletteCagnotte } from '../components/ui/Squelette';

const conteneur = 'mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-[72px]';
const ONGLETS = ['histoire', 'actualites', 'commentaires'];

export default function DetailCagnotte() {
  const { id } = useParams();
  const { utilisateur: utilisateurConnecte } = useAuth();
  const [cagnotte, setCagnotte] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [infosCommentaires, setInfosCommentaires] = useState({ total: 0, page: 1, pages: 1 });
  const [dons, setDons] = useState([]);
  const [infosDons, setInfosDons] = useState({ total: 0, page: 1, pages: 1 });
  const [actualites, setActualites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  // ?onglet=commentaires (lien d'une notification) : ouvre directement cet onglet.
  const [parametres] = useSearchParams();
  const ongletDemande = ONGLETS.includes(parametres.get('onglet')) ? parametres.get('onglet') : null;
  const [onglet, setOnglet] = useState(ongletDemande ?? 'histoire');
  const zoneOnglets = useRef(null);

  // Action en cours (désactive le bouton concerné) et erreur affichée sous chaque zone.
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

  function charger() {
    setErreur('');
    Promise.all([
      api.get(`/cagnottes/${id}`),
      api.get(`/commentaires/cagnotte/${id}`),
      api.get(`/actualites/cagnotte/${id}`),
      api.get(`/dons/cagnotte/${id}`),
    ])
      .then(([resCagnotte, resCommentaires, resActualites, resDons]) => {
        setDons(resDons.data.donnees);
        setInfosDons(resDons.data);
        setCagnotte(resCagnotte.data);
        setCommentaires(resCommentaires.data.donnees);
        setInfosCommentaires(resCommentaires.data);
        setActualites(resActualites.data);
      })
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(charger, [id]);

  // Onglet demandé dans l'adresse : on fait défiler jusqu'aux onglets une fois la page affichée.
  const dejaDefile = useRef(false);
  useEffect(() => {
    if (!chargement && ongletDemande && zoneOnglets.current && !dejaDefile.current) {
      dejaDefile.current = true;
      zoneOnglets.current.scrollIntoView({ block: 'start' });
    }
  }, [chargement, ongletDemande]);

  function voirPlusDons() {
    return executer('listeDons', async () => {
      const res = await api.get(`/dons/cagnotte/${id}`, { params: { page: infosDons.page + 1 } });
      setDons((actuels) => [...actuels, ...res.data.donnees]);
      setInfosDons(res.data);
    });
  }

  function voirPlusCommentaires() {
    return executer('listeCommentaires', async () => {
      const res = await api.get(`/commentaires/cagnotte/${id}`, { params: { page: infosCommentaires.page + 1 } });
      setCommentaires((actuels) => [...actuels, ...res.data.donnees]);
      setInfosCommentaires(res.data);
    });
  }

  if (chargement) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-5 pb-20 pt-8 sm:px-8 lg:px-[72px]">
          <SqueletteCagnotte />
        </div>
      </div>
    );
  }

  if (erreur || !cagnotte) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-5 text-center">
          <p className="text-destructive">{erreur || 'Cagnotte introuvable.'}</p>
          <Button to="/cagnottes">Retour aux cagnottes</Button>
        </div>
      </div>
    );
  }

  const estProprietaire = utilisateurConnecte && utilisateurConnecte.id_utilisateur === cagnotte.id_utilisateur;
  const propsActions = { executer, charger, enCours, erreurs };

  const onglets = [
    { id: 'histoire', libelle: "L'histoire" },
    { id: 'actualites', libelle: 'Actualités', compteur: actualites.length },
    { id: 'commentaires', libelle: 'Commentaires', compteur: infosCommentaires.total },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 pb-20">
        {estProprietaire && (
          <div className="bg-primary-soft">
            <div className={`${conteneur} flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm`}>
              <p className="font-medium text-foreground">Vous êtes l'organisateur de cette cagnotte</p>
              <Link
                to={`/mes-cagnottes/${cagnotte.id_cagnotte}`}
                className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-2 underline-offset-[5px]"
              >
                Gérer la cagnotte →
              </Link>
            </div>
          </div>
        )}
        <div className={`${conteneur} pt-8`}>
          <Link
            to="/cagnottes"
            className="inline-flex min-h-11 items-center gap-2 font-bold text-primary decoration-2 underline-offset-[5px] hover:underline"
          >
            <ArrowLeft className="size-4" />
            Toutes les cagnottes
          </Link>

          {/* Ordre du DOM = ordre mobile (photo et titre, carte de don, puis le reste) ;
              sur grand écran, la carte de don passe dans la colonne de droite, collée en haut. */}
          <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:grid-rows-[auto_1fr]">
            <div className="lg:col-start-1 lg:row-start-1">
              <PhotoCagnotte cagnotte={cagnotte} />
              <EnTeteCagnotte cagnotte={cagnotte} />
            </div>

            <aside className="flex flex-col gap-6 lg:sticky lg:top-[112px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
              <CarteMontant cagnotte={cagnotte}>
                <FormulaireDon idCagnotte={id} utilisateurConnecte={utilisateurConnecte} {...propsActions} />
              </CarteMontant>
              <PartageCagnotte idCagnotte={cagnotte.id_cagnotte} titre={cagnotte.titre} />
              <DerniersDons
                dons={dons}
                infos={infosDons}
                onVoirPlus={voirPlusDons}
                enCours={enCours.listeDons}
                erreur={erreurs.listeDons}
              />
            </aside>

            <div ref={zoneOnglets} className="scroll-mt-[112px] lg:col-start-1 lg:row-start-2">
              <OngletsCagnotte onglets={onglets} actif={onglet} onChanger={setOnglet} />
              <div role="tabpanel" id={`panneau-${onglet}`} aria-labelledby={`onglet-${onglet}`} className="pt-8">
                {onglet === 'histoire' && <HistoireCagnotte description={cagnotte.description} />}
                {onglet === 'actualites' && <ActualitesCagnotte actualites={actualites} />}
                {onglet === 'commentaires' && (
                  <CommentairesCagnotte
                    idCagnotte={id}
                    commentaires={commentaires}
                    infos={infosCommentaires}
                    utilisateurConnecte={utilisateurConnecte}
                    onVoirPlus={voirPlusCommentaires}
                    {...propsActions}
                  />
                )}
              </div>

            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
