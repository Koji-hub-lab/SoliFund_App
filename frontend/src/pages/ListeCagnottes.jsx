import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { SiteHeader } from '../components/site/SiteHeader';
import { SiteFooter } from '../components/site/SiteFooter';
import { Button } from '../components/ui/Button';
import api, { API_URL } from '../api/axios';
import { formaterMontant } from '../utils/format';

function joursRestants(dateFin) {
  const diff = new Date(dateFin) - new Date();
  const jours = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (jours < 0) return 'Terminée';
  if (jours === 0) return 'Dernier jour';
  return `${jours} jours restants`;
}

function CagnotteCard({ c }) {
  const percent = Math.min(100, Math.round((c.montant_collecte / c.objectif) * 100));
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {c.image && (
          <img src={`${API_URL}${c.image}`} alt={c.titre} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        )}
        {c.categorie?.nom && (
          <span className="absolute left-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            {c.categorie.nom}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold leading-snug text-foreground">{c.titre}</h3>

        <div className="mt-4 flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground">{formaterMontant(c.montant_collecte, c.devise)}</span>
            <span className="text-sm font-semibold text-primary">{percent}%</span>
          </div>
          <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              objectif {formaterMontant(c.objectif, c.devise)}
            </span>
            <span>{joursRestants(c.date_fin)}</span>
          </p>
        </div>

        <Button variant="outline" to={`/cagnottes/${c.id_cagnotte}`} className="mt-5 w-full">
          Participer
        </Button>
      </div>
    </article>
  );
}

export default function ListeCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState('');
  const [categorieChoisie, setCategorieChoisie] = useState('');
  const [tri, setTri] = useState('recentes');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const derniereRequete = useRef(0);

  // Recherche, catégorie et tri sont appliqués par l'API. Seule la réponse de la dernière
  // requête est prise en compte (évite qu'une réponse lente écrase un résultat plus récent).
  function charger() {
    const numero = ++derniereRequete.current;
    setErreur('');
    const params = { page, tri };
    if (rechercheEnvoyee) params.recherche = rechercheEnvoyee;
    if (categorieChoisie) params.id_categorie = categorieChoisie;
    api.get('/cagnottes', { params })
      .then((res) => {
        if (numero !== derniereRequete.current) return;
        setCagnottes(res.data.donnees);
        setPages(res.data.pages);
      })
      .catch((err) => numero === derniereRequete.current && setErreur(err.messageAffichable))
      .finally(() => numero === derniereRequete.current && setChargement(false));
  }

  function reessayer() {
    setChargement(true);
    charger();
  }

  useEffect(charger, [page, tri, categorieChoisie, rechercheEnvoyee]);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  // La recherche part 300 ms après la dernière frappe.
  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheEnvoyee(recherche.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  function changerPage(nouvellePage) {
    setPage(nouvellePage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Toutes les cagnottes</h1>
            <p className="mt-2 text-muted-foreground">Parcours les cagnottes actives et trouve une cause à soutenir.</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Rechercher une cagnotte..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="h-11 w-full rounded-xl border border-border pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={categorieChoisie}
              onChange={(e) => { setCategorieChoisie(e.target.value); setPage(1); }}
              className="h-11 rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-56"
            >
              <option value="">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat.id_categorie} value={cat.id_categorie}>{cat.nom}</option>
              ))}
            </select>
            <select
              value={tri}
              onChange={(e) => { setTri(e.target.value); setPage(1); }}
              className="h-11 rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-56"
            >
              <option value="recentes">Plus récentes</option>
              <option value="populaires">Plus populaires</option>
              <option value="bientot_terminees">Bientôt terminées</option>
            </select>
          </div>

          {chargement && <p className="mt-10 text-muted-foreground">Chargement...</p>}
          {erreur && (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-destructive">{erreur}</p>
              <Button variant="outline" onClick={reessayer}>Réessayer</Button>
            </div>
          )}

          {!chargement && !erreur && cagnottes.length === 0 && (
            <p className="mt-10 text-muted-foreground">Aucune cagnotte ne correspond à ta recherche.</p>
          )}

          {!chargement && !erreur && (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cagnottes.map((c) => (
                <CagnotteCard key={c.id_cagnotte} c={c} />
              ))}
            </div>
          )}

          {!chargement && !erreur && pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button variant="outline" disabled={page <= 1} onClick={() => changerPage(page - 1)}>
                Précédent
              </Button>
              <p className="text-sm text-muted-foreground">Page {page} sur {pages}</p>
              <Button variant="outline" disabled={page >= pages} onClick={() => changerPage(page + 1)}>
                Suivant
              </Button>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}