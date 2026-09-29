import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, FiltresPilules, RecherchePilule, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Confirmation from '../../components/ui/Confirmation';
import { nomOperateur } from '../../components/cagnotte/ChoixOperateur';
import api from '../../api/axios';
import { chargerToutesLesPages } from '../../api/pagination';
import { formaterMontant, formaterDateHeure } from '../../utils/format';
import { BadgeStatut, statutsRetrait } from '../../utils/statuts';
import { SqueletteListe } from '../../components/ui/Squelette';

const FILTRES = [
  { valeur: 'EN_ATTENTE', libelle: 'En attente' },
  { valeur: 'TRAITE', libelle: 'Traités' },
  { valeur: 'REJETE', libelle: 'Rejetés' },
  { valeur: 'TOUS', libelle: 'Tous' },
];

export default function AdminRetraits() {
  const [retraits, setRetraits] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('EN_ATTENTE');
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState('');
  // Action à confirmer : { type: 'traiter' | 'rejeter', retrait }.
  const [aConfirmer, setAConfirmer] = useState(null);

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
    if (type === 'traiter') await api.post(`/retraits/${retrait.id_retrait}/traiter`);
    else await api.post(`/retraits/${retrait.id_retrait}/rejeter`, { motif_rejet: motif || undefined });
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

  const montant = aConfirmer ? formaterMontant(aConfirmer.retrait.montant, aConfirmer.retrait.cagnotte.devise) : '';

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin titre="Gestion des retraits" sousTitre="Approuvez ou rejetez les demandes de retrait des organisateurs." />

        <RecherchePilule
          valeur={recherche}
          onChange={setRecherche}
          placeholder="Rechercher une cagnotte, un organisateur, un email..."
          libelle="Rechercher un retrait"
        />
        <FiltresPilules filtres={FILTRES} actif={filtre} onChanger={setFiltre} />

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {chargement && retraits.length === 0 && <SqueletteListe lignes={4} />}

        {!(chargement && retraits.length === 0) && (
          <CarteListe vide={affiches.length === 0} messageVide="Aucune demande dans cette catégorie.">
            {affiches.map((r) => (
              <li key={r.id_retrait} className={classeLigne}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl font-bold text-foreground">{formaterMontant(r.montant, r.cagnotte.devise)}</p>
                    <BadgeStatut statuts={statutsRetrait} statut={r.statut} />
                  </div>
                  <p className="mt-1 font-bold text-foreground">{r.cagnotte.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    Demandé par {r.utilisateur.prenom} {r.utilisateur.nom} ({r.utilisateur.email})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formaterDateHeure(r.date_creation)} · {nomOperateur(r.methode_retrait)} · {r.numero_beneficiaire}
                  </p>
                  {r.motif_rejet && <p className="mt-1 text-sm text-destructive">Motif du rejet : {r.motif_rejet}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" to={`/cagnottes/${r.id_cagnotte}`}>Voir</Button>
                  {r.statut === 'EN_ATTENTE' && (
                    <>
                      <Button size="sm" onClick={() => setAConfirmer({ type: 'traiter', retrait: r })}>Traiter</Button>
                      <Button size="sm" variant="danger" onClick={() => setAConfirmer({ type: 'rejeter', retrait: r })}>Rejeter</Button>
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
        titre={aConfirmer?.type === 'traiter' ? 'Traiter ce retrait ?' : 'Rejeter ce retrait ?'}
        message={
          aConfirmer?.type === 'traiter'
            ? `Confirmez que ${montant} ont bien été versés au ${aConfirmer?.retrait.numero_beneficiaire}. L'organisateur sera prévenu.`
            : `La demande de ${montant} sera rejetée et le montant redeviendra disponible. L'organisateur sera prévenu.`
        }
        libelleConfirmer={aConfirmer?.type === 'traiter' ? 'Traiter le retrait' : 'Rejeter le retrait'}
        variante={aConfirmer?.type === 'traiter' ? 'default' : 'danger'}
        motif={aConfirmer?.type === 'rejeter' ? { libelle: 'Motif du rejet', obligatoire: false, placeholder: 'Ex. numéro bénéficiaire incorrect' } : undefined}
        onConfirmer={confirmer}
        onAnnuler={() => setAConfirmer(null)}
      />
    </AdminLayout>
  );
}
