import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import CarteChiffre from '../components/ui/CarteChiffre';
import CarteCagnotteOrganisateur from '../components/dashboard/CarteCagnotteOrganisateur';
import ElementActivite from '../components/dashboard/ElementActivite';
import AccueilSansCagnotte from '../components/dashboard/AccueilSansCagnotte';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formaterMontant } from '../utils/format';
import { SqueletteChiffres, SqueletteListe } from '../components/ui/Squelette';

const lienCharte = 'inline-flex min-h-11 items-center text-sm font-bold text-primary underline decoration-2 underline-offset-[5px]';
const titreBloc = 'font-display text-[26px] font-bold leading-tight text-foreground';

export default function Dashboard() {
  const { utilisateur } = useAuth();
  const [mesCagnottes, setMesCagnottes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const { t } = useTranslation('tableau-de-bord');

  useEffect(() => {
    Promise.all([api.get('/cagnottes/mes'), api.get('/notifications')])
      .then(([resCagnottes, resNotifs]) => {
        setMesCagnottes(resCagnottes.data);
        setNotifications(resNotifs.data);
      })
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }, [utilisateur]);

  const totalCollecte = mesCagnottes.reduce((acc, c) => acc + Number(c.montant_collecte), 0);
  const totalDisponible = mesCagnottes.reduce((acc, c) => acc + Number(c.montant_disponible ?? 0), 0);
  const nbActives = mesCagnottes.filter((c) => c.statut === 'ACTIVE').length;
  const nbDonateurs = mesCagnottes.reduce((acc, c) => acc + (c.nb_donateurs ?? 0), 0);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
              {t('accueil.bonjour', { prenom: utilisateur.prenom })}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">{t('accueil.sousTitre')}</p>
          </div>
          <Button to="/creer-cagnotte" className="shrink-0">
            <Plus className="size-5" />
            {t('accueil.creer')}
          </Button>
        </div>

        {chargement && (
          <div className="flex flex-col gap-8">
            <SqueletteChiffres />
            <SqueletteListe lignes={3} />
          </div>
        )}
        {erreur && <p className="text-sm text-destructive">{erreur}</p>}

        {!chargement && !erreur && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_0.85fr_0.85fr_1.4fr]">
              <CarteChiffre libelle={t('accueil.totalCollecte')} valeur={formaterMontant(totalCollecte)} teinte="lagune" />
              <CarteChiffre libelle={t('accueil.actives')} valeur={nbActives} />
              <CarteChiffre libelle={t('accueil.donateurs')} valeur={nbDonateurs} />
              <CarteChiffre libelle={t('accueil.disponible')} valeur={formaterMontant(totalDisponible)} valeurEnLagune />
            </div>

            {mesCagnottes.length === 0 ? (
              <AccueilSansCagnotte />
            ) : (
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
                <section>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className={titreBloc}>{t('accueil.mesCagnottes')}</h2>
                    <Link to="/mes-cagnottes" className={lienCharte}>{t('accueil.toutVoir')}</Link>
                  </div>
                  <div className="mt-5 flex flex-col gap-4">
                    {mesCagnottes.slice(0, 3).map((c) => (
                      <CarteCagnotteOrganisateur key={c.id_cagnotte} cagnotte={c} />
                    ))}
                  </div>
                </section>

                <section className="self-start rounded-[28px] border border-border bg-card p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className={titreBloc}>{t('accueil.activite')}</h2>
                    <Link to="/notifications" className={lienCharte}>{t('accueil.toutVoir')}</Link>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="mt-5 text-base text-muted-foreground">{t('accueil.aucuneActivite')}</p>
                  ) : (
                    <ul className="m-0 mt-5 flex list-none flex-col gap-5 p-0">
                      {notifications.slice(0, 4).map((r) => (
                        <ElementActivite key={r.id_notification} recu={r} tronquer />
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
