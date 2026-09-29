import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { SiteHeader } from '../components/site/SiteHeader';
import { SiteFooter } from '../components/site/SiteFooter';
import { Button } from '../components/ui/Button';
import { SymboleNjangi } from '../components/Logo';
import CarteCagnotte from '../components/cagnotte/CarteCagnotte';
import CarteCagnotteSquelette from '../components/cagnotte/CarteCagnotteSquelette';
import api from '../api/axios';

const conteneur = 'mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-[72px]';
const TRIS = [
  { valeur: 'recentes', libelle: 'Plus récentes' },
  { valeur: 'populaires', libelle: 'Plus populaires' },
  { valeur: 'bientot_terminees', libelle: 'Bientôt terminées' },
];

export default function ListeCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState('');
  const [categorieChoisie, setCategorieChoisie] = useState('');
  const [tri, setTri] = useState('recentes');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  // chargement : premier affichage (squelettes) ; enCours : requête en cours (résultats estompés).
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [erreurCategories, setErreurCategories] = useState('');
  const derniereRequete = useRef(0);

  // Recherche, catégorie et tri sont appliqués par l'API. Seule la réponse de la dernière
  // requête est prise en compte (évite qu'une réponse lente écrase un résultat plus récent).
  function charger() {
    const numero = ++derniereRequete.current;
    setErreur('');
    setEnCours(true);
    const params = { page, tri };
    if (rechercheEnvoyee) params.recherche = rechercheEnvoyee;
    if (categorieChoisie) params.id_categorie = categorieChoisie;
    api.get('/cagnottes', { params })
      .then((res) => {
        if (numero !== derniereRequete.current) return;
        setCagnottes(res.data.donnees);
        setPages(res.data.pages);
        setTotal(res.data.total);
      })
      .catch((err) => numero === derniereRequete.current && setErreur(err.messageAffichable))
      .finally(() => {
        if (numero !== derniereRequete.current) return;
        setChargement(false);
        setEnCours(false);
      });
  }

  function reessayer() {
    setChargement(true);
    charger();
  }

  useEffect(charger, [page, tri, categorieChoisie, rechercheEnvoyee]);

  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => setErreurCategories(err.messageAffichable));
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
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function effacerFiltres() {
    setRecherche('');
    setRechercheEnvoyee('');
    setCategorieChoisie('');
    setPage(1);
  }

  const filtres = [{ id_categorie: '', nom: 'Toutes' }, ...categories];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-primary-soft">
          <div className={`${conteneur} py-12 lg:py-16`}>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Découvrir</p>
            <h1 className="mt-3 font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground lg:text-[52px]">
              Toutes les cagnottes
            </h1>

            <div className="mt-8 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-6 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  aria-label="Rechercher une cagnotte"
                  placeholder="Rechercher une cagnotte..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="h-[60px] w-full rounded-full border-2 border-border bg-card pl-14 pr-6 font-sans text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <select
                aria-label="Trier les cagnottes"
                value={tri}
                onChange={(e) => { setTri(e.target.value); setPage(1); }}
                className="h-[60px] rounded-full border-2 border-border bg-card px-6 font-sans text-base font-bold text-foreground outline-none transition-colors focus:border-primary md:w-60"
              >
                {TRIS.map((t) => (
                  <option key={t.valeur} value={t.valeur}>{t.libelle}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className={`${conteneur} py-10 lg:py-12`}>
          <div className="flex flex-wrap gap-2">
            {filtres.map((f) => {
              const actif = String(f.id_categorie) === String(categorieChoisie);
              return (
                <button
                  key={f.id_categorie || 'toutes'}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => { setCategorieChoisie(f.id_categorie); setPage(1); }}
                  className={`inline-flex min-h-11 items-center rounded-full border px-5 py-2.5 font-sans text-sm font-bold transition-colors ${
                    actif ? 'border-encre bg-encre text-primary-foreground hover:bg-encre' : 'border-border bg-card text-foreground hover:bg-secondary'
                  }`}
                >
                  {f.nom}
                </button>
              );
            })}
          </div>
          {erreurCategories && (
            <p className="mt-3 text-sm text-destructive">Les catégories n'ont pas pu être chargées. {erreurCategories}</p>
          )}

          {!chargement && !erreur && (
            <p className="mt-6 text-base text-muted-foreground" aria-live="polite">
              {total} cagnotte{total > 1 ? 's' : ''}
            </p>
          )}

          {erreur && (
            <div className="mt-8 flex flex-col items-center gap-4 rounded-[32px] border border-border bg-card p-10 text-center">
              <p className="text-destructive">{erreur}</p>
              <Button variant="outline" onClick={reessayer}>Réessayer</Button>
            </div>
          )}

          {chargement && !erreur && (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <CarteCagnotteSquelette key={i} />
              ))}
            </div>
          )}

          {!chargement && !erreur && cagnottes.length === 0 && (
            <div className="mt-6 flex flex-col items-center rounded-[32px] border border-border bg-card px-6 py-14 text-center">
              <SymboleNjangi taille={64} />
              <p className="mt-6 font-display text-[26px] font-bold leading-tight text-foreground">
                Aucune cagnotte ne correspond à votre recherche
              </p>
              <Button variant="outline" onClick={effacerFiltres} className="mt-6">
                Effacer les filtres
              </Button>
            </div>
          )}

          {!chargement && !erreur && cagnottes.length > 0 && (
            <div className={`mt-6 grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${enCours ? 'opacity-60' : ''}`}>
              {cagnottes.map((c) => (
                <CarteCagnotte key={c.id_cagnotte} c={c} />
              ))}
            </div>
          )}

          {!chargement && !erreur && pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
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
