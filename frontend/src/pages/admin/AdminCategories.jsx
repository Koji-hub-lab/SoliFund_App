import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import Champ from '../../components/ui/Champ';
import Confirmation from '../../components/ui/Confirmation';
import { SqueletteListe } from '../../components/ui/Squelette';
import api from '../../api/axios';

// Couleurs proposées : celles de la charte (voir DESIGN.md).
const COULEURS = ['#087F7A', '#055955', '#E9A23B', '#17262A'];
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
  const { t } = useTranslation('admin');
  return (
    <Champ as="select" id={id} libelle={t('categories.couleur')} value={valeur} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('categories.aucuneCouleur')}</option>
      {COULEURS.map((c) => (
        <option key={c} value={c}>{t(`categories.couleurs.${c}`)}</option>
      ))}
    </Champ>
  );
}

// Envoie la couleur choisie, ou null pour « Aucune ».
function donneesFormulaire(form) {
  return { nom: form.nom, couleur: form.couleur || null };
}

export default function AdminCategories() {
  const { t } = useTranslation('admin');
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
      setErreurCreation(t('categories.nomObligatoire'));
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
    setEdition({ id: c.id_categorie, nom: c.nom, couleur: COULEURS.includes(c.couleur) ? c.couleur : '' });
  }

  async function enregistrer(e) {
    e.preventDefault();
    const { id } = edition;
    if (!edition.nom.trim()) {
      setErreurs((x) => ({ ...x, [id]: t('categories.nomObligatoire') }));
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
        <EnTeteAdmin titre={t('categories.titre')} sousTitre={t('categories.sousTitre')} />

        <form onSubmit={creer} noValidate className="flex flex-col gap-5 rounded-[28px] border border-border bg-card p-6 sm:p-7">
          <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">{t('categories.ajouterTitre')}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Champ id="nouvelle-nom" libelle={t('categories.nom')} value={nouvelle.nom} maxLength={100} onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })} placeholder={t('categories.nomPlaceholder')} />
            <ChoixCouleur id="nouvelle-couleur" valeur={nouvelle.couleur} onChange={(couleur) => setNouvelle({ ...nouvelle, couleur })} />
          </div>
          {erreurCreation && <p className="text-sm text-destructive">{erreurCreation}</p>}
          <Button type="submit" disabled={creationEnCours} className="sm:self-start">
            {creationEnCours ? t('categories.ajout') : t('categories.ajouter')}
          </Button>
        </form>

        {erreurChargement && <p className="text-sm text-destructive">{erreurChargement}</p>}
        {chargement ? (
          <SqueletteListe lignes={3} />
        ) : (
          <CarteListe vide={categories.length === 0} messageVide={t('categories.vide')}>
            {categories.map((c) => {
              const nb = c.nb_cagnottes;
              if (edition?.id === c.id_categorie) {
                return (
                  <li key={c.id_categorie} className="py-5">
                    <form onSubmit={enregistrer} noValidate className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <Champ id={`nom-${c.id_categorie}`} libelle={t('categories.nom')} value={edition.nom} maxLength={100} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} />
                        <ChoixCouleur id={`couleur-${c.id_categorie}`} valeur={edition.couleur} onChange={(couleur) => setEdition({ ...edition, couleur })} />
                      </div>
                      {erreurs[c.id_categorie] && <p className="text-sm text-destructive">{erreurs[c.id_categorie]}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm" disabled={enregistrement}>{enregistrement ? t('commun:actions.enregistrement') : t('commun:actions.enregistrer')}</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEdition(null)} disabled={enregistrement}>{t('commun:actions.annuler')}</Button>
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
                        {nb === 0 ? t('categories.aucuneCagnotte') : t('categories.cagnottes', { count: nb })}
                      </p>
                      {erreurs[c.id_categorie] && <p className="mt-1 text-sm text-destructive">{erreurs[c.id_categorie]}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => commencerEdition(c)} disabled={edition !== null}>{t('categories.modifier')}</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setASupprimer(c)}
                      disabled={edition !== null || nb > 0}
                      title={nb > 0 ? t('categories.suppressionImpossible') : undefined}
                    >
                      {t('categories.supprimer')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </CarteListe>
        )}
        {categories.some((c) => c.nb_cagnottes > 0) && (
          <p className="-mt-4 text-sm text-muted-foreground">{t('categories.suppressionImpossible')}</p>
        )}
      </div>

      <Confirmation
        ouvert={!!aSupprimer}
        titre={t('categories.supprimerTitre')}
        message={aSupprimer ? t('categories.supprimerMessage', { nom: aSupprimer.nom }) : ''}
        libelleConfirmer={t('categories.supprimerLibelle')}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </AdminLayout>
  );
}
