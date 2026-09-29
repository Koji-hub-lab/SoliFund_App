import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import CarteCagnotteOrganisateur from '../components/dashboard/CarteCagnotteOrganisateur';
import AccueilSansCagnotte from '../components/dashboard/AccueilSansCagnotte';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { SqueletteListe } from '../components/ui/Squelette';

// Filtres par statut, appliqués à la liste déjà chargée.
const FILTRES = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'ACTIVE', libelle: 'Actives' },
  { valeur: 'TERMINEE', libelle: 'Terminées' },
  { valeur: 'SUSPENDUE', libelle: 'Suspendues' },
  { valeur: 'ANNULEE', libelle: 'Annulées' },
];

export default function MesCagnottes() {
  const { utilisateur } = useAuth();
  const [cagnottes, setCagnottes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('');
  const [erreur, setErreur] = useState('');

  function charger() {
    setChargement(true);
    setErreur('');
    api.get('/cagnottes/mes')
      .then((res) => setCagnottes(res.data))
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(charger, [utilisateur]);

  const affichees = filtre ? cagnottes.filter((c) => c.statut === filtre) : cagnottes;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
              Mes cagnottes
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">Gérez toutes les cagnottes que vous avez créées.</p>
          </div>
          <Button to="/creer-cagnotte" className="shrink-0">
            <Plus className="size-5" />
            Créer une cagnotte
          </Button>
        </div>

        {chargement && <SqueletteListe lignes={3} />}

        {!chargement && erreur && (
          <div className="flex flex-col items-center gap-4 rounded-[32px] border border-border bg-card p-10 text-center">
            <p className="text-destructive">{erreur}</p>
            <Button variant="outline" onClick={charger}>Réessayer</Button>
          </div>
        )}

        {!chargement && !erreur && cagnottes.length === 0 && <AccueilSansCagnotte />}

        {!chargement && !erreur && cagnottes.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {FILTRES.map((f) => {
                const actif = f.valeur === filtre;
                const nombre = f.valeur ? cagnottes.filter((c) => c.statut === f.valeur).length : cagnottes.length;
                return (
                  <button
                    key={f.valeur || 'toutes'}
                    type="button"
                    onClick={() => setFiltre(f.valeur)}
                    aria-pressed={actif}
                    className={`inline-flex min-h-11 items-center rounded-full border px-5 py-2.5 font-sans text-sm font-bold transition-colors ${
                      actif ? 'border-encre bg-encre text-primary-foreground hover:bg-encre' : 'border-border bg-card text-foreground hover:bg-secondary'
                    }`}
                  >
                    {f.libelle} ({nombre})
                  </button>
                );
              })}
            </div>

            {affichees.length === 0 ? (
              <p className="text-base text-muted-foreground">Aucune cagnotte dans cette catégorie.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {affichees.map((c) => (
                  <CarteCagnotteOrganisateur key={c.id_cagnotte} cagnotte={c} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
