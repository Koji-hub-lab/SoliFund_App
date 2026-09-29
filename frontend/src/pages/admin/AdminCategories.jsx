import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Champ from '../../components/ui/Champ';
import Confirmation from '../../components/ui/Confirmation';
import { SqueletteListe } from '../../components/ui/Squelette';
import api from '../../api/axios';

// Couleurs proposées : celles de la charte (voir DESIGN.md).
const COULEURS = [
  { valeur: '#087F7A', libelle: 'Lagune' },
  { valeur: '#055955', libelle: 'Lagune foncée' },
  { valeur: '#E9A23B', libelle: 'Ambre' },
  { valeur: '#17262A', libelle: 'Encre' },
];
const FORMULAIRE_VIDE = { nom: '', couleur: '' };

// Pastille de couleur ; neutre si la catégorie n'a pas de couleur valide (anciennes valeurs libres).
function PastilleCouleur({ couleur }) {
  const valide = /^#[0-9A-Fa-f]{6}$/.test(couleur ?? '');
  return (
    <span
      className={`size-10 shrink-0 rounded-full ${valide ? '' : 'border-2 border-dashed border-border bg-background'}`}
      style={valide ? { backgroundColor: couleur } : undefined}
      aria-hidden="true"
    />
  );
}

function ChoixCouleur({ id, valeur, onChange }) {
  return (
    <Champ as="select" id={id} libelle="Couleur" value={valeur} onChange={(e) => onChange(e.target.value)}>
      <option value="">Aucune</option>
      {COULEURS.map((c) => (
        <option key={c.valeur} value={c.valeur}>{c.libelle}</option>
      ))}
    </Champ>
  );
}

// Envoie la couleur choisie, ou null pour « Aucune ».
function donneesFormulaire(form) {
  return { nom: form.nom, couleur: form.couleur || null };
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');

  const [nouvelle, setNouvelle] = useState(FORMULAIRE_VIDE);
  const [erreurCreation, setErreurCreation] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);

  // Ligne en cours de modification : { id, nom, couleur } ; erreurs par id_categorie.
  const [edition, setEdition] = useState(null);
  const [erreurs, setErreurs] = useState({});
  const [enregistrement, setEnregistrement] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);

  function charger() {
    setErreurChargement('');
    return api.get('/categories/admin')
      .then((res) => setCategories(res.data))
      .catch((err) => setErreurChargement(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function creer(e) {
    e.preventDefault();
    setErreurCreation('');
    if (!nouvelle.nom.trim()) {
      setErreurCreation('Le nom est obligatoire.');
      return;
    }
    setCreationEnCours(true);
    try {
      await api.post('/categories', donneesFormulaire(nouvelle));
      setNouvelle(FORMULAIRE_VIDE);
      await charger();
    } catch (err) {
      setErreurCreation(err.messageAffichable);
    } finally {
      setCreationEnCours(false);
    }
  }

  function commencerEdition(c) {
    setErreurs((e) => ({ ...e, [c.id_categorie]: '' }));
    setEdition({ id: c.id_categorie, nom: c.nom, couleur: COULEURS.some((x) => x.valeur === c.couleur) ? c.couleur : '' });
  }

  async function enregistrer(e) {
    e.preventDefault();
    const { id } = edition;
    if (!edition.nom.trim()) {
      setErreurs((x) => ({ ...x, [id]: 'Le nom est obligatoire.' }));
      return;
    }
    setEnregistrement(true);
    try {
      await api.patch(`/categories/${id}`, donneesFormulaire(edition));
      setEdition(null);
      await charger();
    } catch (err) {
      setErreurs((x) => ({ ...x, [id]: err.messageAffichable }));
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimer() {
    await api.delete(`/categories/${aSupprimer.id_categorie}`);
    setASupprimer(null);
    await charger();
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <EnTeteAdmin titre="Catégories" sousTitre="Les catégories proposées aux organisateurs et utilisées comme filtres sur le site." />

        <form onSubmit={creer} noValidate className="flex flex-col gap-5 rounded-[28px] border border-border bg-card p-6 sm:p-7">
          <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">Ajouter une catégorie</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Champ id="nouvelle-nom" libelle="Nom" value={nouvelle.nom} maxLength={100} onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })} placeholder="Éducation" />
            <ChoixCouleur id="nouvelle-couleur" valeur={nouvelle.couleur} onChange={(couleur) => setNouvelle({ ...nouvelle, couleur })} />
          </div>
          {erreurCreation && <p className="text-sm text-destructive">{erreurCreation}</p>}
          <Button type="submit" disabled={creationEnCours} className="sm:self-start">
            {creationEnCours ? 'Ajout en cours...' : 'Ajouter la catégorie'}
          </Button>
        </form>

        {erreurChargement && <p className="text-sm text-destructive">{erreurChargement}</p>}
        {chargement ? (
          <SqueletteListe lignes={3} />
        ) : (
          <CarteListe vide={categories.length === 0} messageVide="Aucune catégorie pour le moment.">
            {categories.map((c) => {
              const nb = c.nb_cagnottes;
              if (edition?.id === c.id_categorie) {
                return (
                  <li key={c.id_categorie} className="py-5">
                    <form onSubmit={enregistrer} noValidate className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <Champ id={`nom-${c.id_categorie}`} libelle="Nom" value={edition.nom} maxLength={100} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} />
                        <ChoixCouleur id={`couleur-${c.id_categorie}`} valeur={edition.couleur} onChange={(couleur) => setEdition({ ...edition, couleur })} />
                      </div>
                      {erreurs[c.id_categorie] && <p className="text-sm text-destructive">{erreurs[c.id_categorie]}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm" disabled={enregistrement}>{enregistrement ? 'Enregistrement...' : 'Enregistrer'}</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEdition(null)} disabled={enregistrement}>Annuler</Button>
                      </div>
                    </form>
                  </li>
                );
              }
              return (
                <li key={c.id_categorie} className={classeLigne}>
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <PastilleCouleur couleur={c.couleur} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{c.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {nb === 0 ? 'Aucune cagnotte' : `${nb} cagnotte${nb > 1 ? 's' : ''}`}
                      </p>
                      {erreurs[c.id_categorie] && <p className="mt-1 text-sm text-destructive">{erreurs[c.id_categorie]}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => commencerEdition(c)} disabled={edition !== null}>Modifier</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setASupprimer(c)}
                      disabled={edition !== null || nb > 0}
                      title={nb > 0 ? 'Une catégorie utilisée par des cagnottes ne peut pas être supprimée.' : undefined}
                    >
                      Supprimer
                    </Button>
                  </div>
                </li>
              );
            })}
          </CarteListe>
        )}
        {categories.some((c) => c.nb_cagnottes > 0) && (
          <p className="-mt-4 text-sm text-muted-foreground">Une catégorie utilisée par des cagnottes ne peut pas être supprimée.</p>
        )}
      </div>

      <Confirmation
        ouvert={!!aSupprimer}
        titre="Supprimer cette catégorie ?"
        message={aSupprimer ? `« ${aSupprimer.nom} » ne sera plus proposée aux organisateurs.` : ''}
        libelleConfirmer="Supprimer la catégorie"
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </AdminLayout>
  );
}
