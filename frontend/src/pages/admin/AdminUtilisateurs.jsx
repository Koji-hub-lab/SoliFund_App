import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, FiltresPilules, RecherchePilule, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Confirmation from '../../components/ui/Confirmation';
import PastilleInitiale from '../../components/cagnotte/PastilleInitiale';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { chargerToutesLesPages } from '../../api/pagination';
import { formaterDate } from '../../utils/format';
import { BadgeStatut, statutsUtilisateur } from '../../utils/statuts';
import { SqueletteListe } from '../../components/ui/Squelette';

const FILTRES = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'ACTIF', libelle: 'Actifs' },
  { valeur: 'SUSPENDU', libelle: 'Suspendus' },
  { valeur: 'BANNI', libelle: 'Bannis' },
];

const CONFIRMATIONS = {
  SUSPENDU: {
    titre: 'Suspendre ce compte ?',
    message: (u) => `${u.prenom} ${u.nom} ne pourra plus se connecter tant que son compte sera suspendu.`,
    libelle: 'Suspendre le compte',
  },
  BANNI: {
    titre: 'Bannir ce compte ?',
    message: (u) => `${u.prenom} ${u.nom} ne pourra plus se connecter, et ses cagnottes actives seront suspendues.`,
    libelle: 'Bannir le compte',
  },
};

export default function AdminUtilisateurs() {
  const { utilisateur: moi } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('');
  // Réactivation en cours et erreurs ({ chargement | id_utilisateur: message }).
  const [enCours, setEnCours] = useState(null);
  const [erreurs, setErreurs] = useState({});
  // Changement de statut sensible à confirmer : { utilisateur, statut }.
  const [aConfirmer, setAConfirmer] = useState(null);

  function charger() {
    setChargement(true);
    setErreurs((e) => ({ ...e, chargement: '' }));
    return chargerToutesLesPages('/utilisateurs')
      .then((res) => setUtilisateurs(res.donnees))
      .catch((err) => setErreurs((e) => ({ ...e, chargement: err.messageAffichable })))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function reactiver(id) {
    if (enCours) return;
    setEnCours(id);
    setErreurs((e) => ({ ...e, [id]: '' }));
    try {
      await api.patch(`/utilisateurs/${id}/statut`, { statut: 'ACTIF' });
      await charger();
    } catch (err) {
      setErreurs((e) => ({ ...e, [id]: err.messageAffichable }));
    } finally {
      setEnCours(null);
    }
  }

  async function confirmer() {
    await api.patch(`/utilisateurs/${aConfirmer.utilisateur.id_utilisateur}/statut`, { statut: aConfirmer.statut });
    setAConfirmer(null);
    await charger();
  }

  // Filtre et recherche dans la liste chargée (nom, prénom, email).
  const terme = recherche.trim().toLowerCase();
  const affiches = utilisateurs.filter(
    (u) => (!filtre || u.statut === filtre) && (!terme || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(terme)),
  );
  const conf = aConfirmer ? CONFIRMATIONS[aConfirmer.statut] : null;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin
          titre="Utilisateurs"
          sousTitre={`${utilisateurs.length} compte${utilisateurs.length > 1 ? 's' : ''} inscrit${utilisateurs.length > 1 ? 's' : ''} sur la plateforme.`}
        />

        <RecherchePilule valeur={recherche} onChange={setRecherche} placeholder="Rechercher un nom ou un email..." libelle="Rechercher un utilisateur" />
        <FiltresPilules filtres={FILTRES} actif={filtre} onChanger={setFiltre} />

        {erreurs.chargement && <p className="text-sm text-destructive">{erreurs.chargement}</p>}
        {chargement && utilisateurs.length === 0 && <SqueletteListe lignes={4} />}

        {!(chargement && utilisateurs.length === 0) && (
          <CarteListe vide={affiches.length === 0} messageVide="Aucun utilisateur ne correspond à votre recherche.">
            {affiches.map((u) => {
              const estAdmin = u.roles.includes('ROLE_ADMIN');
              // Le backend refuse de modifier un admin ou son propre compte : aucune action proposée.
              const protege = estAdmin || u.id_utilisateur === moi?.id_utilisateur;
              return (
                <li key={u.id_utilisateur} className={classeLigne}>
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <PastilleInitiale prenom={u.prenom} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-foreground">{u.prenom} {u.nom}</p>
                        <BadgeStatut statuts={statutsUtilisateur} statut={u.statut} />
                        {estAdmin && <span className="rounded-full bg-encre px-3 py-1 text-xs font-bold text-primary-foreground">Admin</span>}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{u.email} · inscrit le {formaterDate(u.date_inscription)}</p>
                      {erreurs[u.id_utilisateur] && <p className="mt-1 text-sm text-destructive">{erreurs[u.id_utilisateur]}</p>}
                    </div>
                  </div>
                  {protege ? (
                    <span className="text-sm text-muted-foreground" title="Le statut d'un administrateur ne peut pas être modifié.">—</span>
                  ) : (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {u.statut !== 'ACTIF' && (
                        <Button size="sm" onClick={() => reactiver(u.id_utilisateur)} disabled={enCours !== null}>
                          {enCours === u.id_utilisateur ? 'Envoi en cours...' : 'Réactiver'}
                        </Button>
                      )}
                      {u.statut !== 'SUSPENDU' && (
                        <Button size="sm" variant="danger" onClick={() => setAConfirmer({ utilisateur: u, statut: 'SUSPENDU' })} disabled={enCours !== null}>
                          Suspendre
                        </Button>
                      )}
                      {u.statut !== 'BANNI' && (
                        <Button size="sm" variant="danger" onClick={() => setAConfirmer({ utilisateur: u, statut: 'BANNI' })} disabled={enCours !== null}>
                          Bannir
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </CarteListe>
        )}
      </div>

      <Confirmation
        ouvert={!!aConfirmer}
        titre={conf?.titre ?? ''}
        message={conf && aConfirmer ? conf.message(aConfirmer.utilisateur) : ''}
        libelleConfirmer={conf?.libelle}
        onConfirmer={confirmer}
        onAnnuler={() => setAConfirmer(null)}
      />
    </AdminLayout>
  );
}
