import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, FiltresPilules, RecherchePilule, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Confirmation from '../../components/ui/Confirmation';
import api from '../../api/axios';
import { formaterMontant, formaterDate } from '../../utils/format';
import { BadgeStatut, statutsCagnotte } from '../../utils/statuts';
import { SqueletteListe } from '../../components/ui/Squelette';

const FILTRES = [
  { valeur: 'ACTIVE', libelle: 'Actives' },
  { valeur: 'SUSPENDUE', libelle: 'Suspendues' },
  { valeur: 'TERMINEE', libelle: 'Terminées' },
  { valeur: 'ANNULEE', libelle: 'Annulées' },
  { valeur: 'TOUTES', libelle: 'Toutes' },
];

export default function AdminCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('ACTIVE');
  const [recherche, setRecherche] = useState('');
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  // Réactivation en cours et erreurs ({ chargement | id_cagnotte: message }).
  const [enCours, setEnCours] = useState(null);
  const [erreurs, setErreurs] = useState({});
  // Cagnotte dont la suspension est à confirmer (avec motif obligatoire).
  const [aSuspendre, setASuspendre] = useState(null);
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

  async function suspendre(motif) {
    await api.patch(`/admin/cagnottes/${aSuspendre.id_cagnotte}/statut`, { statut: 'SUSPENDUE', motif });
    setASuspendre(null);
    await charger();
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin titre="Gestion des cagnottes" sousTitre="Suspendez ou réactivez les cagnottes de la plateforme." />

        <RecherchePilule valeur={recherche} onChange={setRecherche} placeholder="Rechercher une cagnotte..." libelle="Rechercher une cagnotte" />
        <FiltresPilules filtres={FILTRES} actif={filtre} onChanger={changerFiltre} />

        {erreurs.chargement && <p className="text-sm text-destructive">{erreurs.chargement}</p>}
        {chargement && cagnottes.length === 0 && <SqueletteListe lignes={4} />}

        {!(chargement && cagnottes.length === 0) && (
          <CarteListe vide={cagnottes.length === 0} messageVide="Aucune cagnotte dans cette catégorie.">
            {cagnottes.map((c) => (
              <li key={c.id_cagnotte} className={classeLigne}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl font-bold text-foreground">{c.titre}</p>
                    <BadgeStatut statuts={statutsCagnotte} statut={c.statut} />
                    {!c.est_publique && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">Privée</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Organisée par {c.utilisateur.prenom} {c.utilisateur.nom} ({c.utilisateur.email})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{formaterMontant(c.montant_collecte, c.devise)}</strong> sur {formaterMontant(c.objectif, c.devise)}
                    {' · '}{c.categorie?.nom || 'Sans catégorie'} · du {formaterDate(c.date_debut)} au {formaterDate(c.date_fin)}
                  </p>
                  {erreurs[c.id_cagnotte] && <p className="mt-1 text-sm text-destructive">{erreurs[c.id_cagnotte]}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" to={`/cagnottes/${c.id_cagnotte}`}>Voir</Button>
                  {c.statut === 'ACTIVE' && (
                    <Button size="sm" variant="danger" onClick={() => setASuspendre(c)} disabled={enCours !== null}>Suspendre</Button>
                  )}
                  {c.statut === 'SUSPENDUE' && (
                    <Button size="sm" onClick={() => reactiver(c.id_cagnotte)} disabled={enCours !== null}>
                      {enCours === c.id_cagnotte ? 'Envoi en cours...' : 'Réactiver'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </CarteListe>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => changerPage(page - 1)}>Précédent</Button>
            <p className="text-sm text-muted-foreground">Page {page} sur {pages}</p>
            <Button variant="outline" disabled={page >= pages} onClick={() => changerPage(page + 1)}>Suivant</Button>
          </div>
        )}
      </div>

      <Confirmation
        ouvert={!!aSuspendre}
        titre="Suspendre cette cagnotte ?"
        message={aSuspendre ? `« ${aSuspendre.titre} » ne pourra plus recevoir de dons et ne sera plus visible publiquement. L'organisateur recevra le motif.` : ''}
        libelleConfirmer="Suspendre la cagnotte"
        motif={{ libelle: 'Motif de la suspension', obligatoire: true, placeholder: 'Ex. justificatifs manquants' }}
        onConfirmer={suspendre}
        onAnnuler={() => setASuspendre(null)}
      />
    </AdminLayout>
  );
}
