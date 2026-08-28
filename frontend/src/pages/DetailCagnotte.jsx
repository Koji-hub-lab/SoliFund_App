import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Pencil, Trash2, ImagePlus, Users, Calendar, Send } from 'lucide-react';
import { SiteHeader } from '../components/site/SiteHeader';
import { SiteFooter } from '../components/site/SiteFooter';
import { Button } from '../components/ui/Button';
import api, { API_URL } from '../api/axios';
import { formaterMontant, formaterDate, formaterDateHeure } from '../utils/format';

function joursRestants(dateFin) {
  const diff = new Date(dateFin) - new Date();
  const jours = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (jours < 0) return 'Terminée';
  if (jours === 0) return 'Dernier jour';
  return `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`;
}

export default function DetailCagnotte() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cagnotte, setCagnotte] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [actualites, setActualites] = useState([]);
  const [retraits, setRetraits] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const utilisateurConnecte = JSON.parse(localStorage.getItem('utilisateur') || 'null');

  // Don
  const [montant, setMontant] = useState('');
  const [numero, setNumero] = useState('');
  const [methode, setMethode] = useState('MTN_MOBILE_MONEY');
  const [messageDon, setMessageDon] = useState('');

  // Commentaire
  const [nouveauCommentaire, setNouveauCommentaire] = useState('');

  // Actualité (propriétaire)
  const [nouvelleActualite, setNouvelleActualite] = useState({ titre: '', contenu: '' });

  // Retrait (propriétaire)
  const [montantRetrait, setMontantRetrait] = useState('');
  const [numeroRetrait, setNumeroRetrait] = useState('');
  const [methodeRetrait, setMethodeRetrait] = useState('MTN_MOBILE_MONEY');

  // Image (propriétaire)
  const [fichierImage, setFichierImage] = useState(null);

  function charger() {
    setErreur('');
    Promise.all([
      api.get(`/cagnottes/${id}`),
      api.get(`/commentaires/cagnotte/${id}`),
      api.get(`/actualites/cagnotte/${id}`),
    ])
      .then(([resCagnotte, resCommentaires, resActualites]) => {
        setCagnotte(resCagnotte.data);
        setCommentaires(resCommentaires.data);
        setActualites(resActualites.data);
        if (utilisateurConnecte && resCagnotte.data.id_utilisateur === utilisateurConnecte.id_utilisateur) {
          api.get(`/retraits/cagnotte/${id}`).then((res) => setRetraits(res.data));
        }
      })
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }

  useEffect(charger, [id]);

  async function faireDon(e) {
    e.preventDefault();
    const res = await api.post('/dons', {
      id_cagnotte: Number(id),
      montant: Number(montant),
      methode_paiement: methode,
      numero_payeur: numero,
    });
    await api.post(`/dons/${res.data.id_don}/valider`);
    setMontant('');
    setNumero('');
    setMessageDon('Merci pour ton don !');
    charger();
  }

  async function posterCommentaire(e) {
    e.preventDefault();
    if (!nouveauCommentaire.trim()) return;
    await api.post('/commentaires', { id_cagnotte: Number(id), description: nouveauCommentaire });
    setNouveauCommentaire('');
    charger();
  }

  async function supprimerCommentaire(idCommentaire) {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await api.delete(`/commentaires/${idCommentaire}`);
    charger();
  }

  async function publierActualite(e) {
    e.preventDefault();
    await api.post('/actualites', { id_cagnotte: Number(id), ...nouvelleActualite });
    setNouvelleActualite({ titre: '', contenu: '' });
    charger();
  }

  async function demanderRetrait(e) {
    e.preventDefault();
    await api.post('/retraits', {
      id_cagnotte: Number(id),
      montant: Number(montantRetrait),
      methode_retrait: methodeRetrait,
      numero_beneficiaire: numeroRetrait,
    });
    setMontantRetrait('');
    setNumeroRetrait('');
    charger();
  }

  async function uploaderImage(e) {
    e.preventDefault();
    if (!fichierImage) return;
    const formData = new FormData();
    formData.append('image', fichierImage);
    await api.post(`/cagnottes/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setFichierImage(null);
    charger();
  }

  async function supprimerCagnotte() {
    if (!window.confirm('Supprimer définitivement cette cagnotte ? Cette action est irréversible.')) return;
    await api.delete(`/cagnottes/${id}`);
    navigate('/mes-cagnottes');
  }

  if (chargement) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (erreur || !cagnotte) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="mx-auto flex flex-1 max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-destructive">{erreur || 'Cagnotte introuvable.'}</p>
          <Button to="/cagnottes-toutes">Retour aux cagnottes</Button>
        </div>
      </div>
    );
  }

  const pourcentage = Math.min(100, Math.round((cagnotte.montant_collecte / cagnotte.objectif) * 100));
  const estProprietaire = utilisateurConnecte && utilisateurConnecte.id_utilisateur === cagnotte.id_utilisateur;
  const dejaRetire = retraits.filter((r) => ['APPROUVE', 'TRAITE'].includes(r.statut)).reduce((acc, r) => acc + Number(r.montant), 0);
  const disponibleRetrait = Number(cagnotte.montant_collecte) - dejaRetire;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Colonne principale */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl bg-secondary shadow-sm">
                {cagnotte.image ? (
                  <img src={`${API_URL}${cagnotte.image}`} alt={cagnotte.titre} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center text-muted-foreground">Aucune image</div>
                )}
              </div>

              <div className="mt-6 flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{cagnotte.titre}</h1>
                {estProprietaire && (
                  <div className="flex shrink-0 gap-2">
                    <Link to={`/cagnottes/${id}/modifier`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                      <Pencil className="size-3.5" />
                      Modifier
                    </Link>
                    <button onClick={supprimerCagnotte} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-transparent px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  Du {formaterDate(cagnotte.date_debut)} au {formaterDate(cagnotte.date_fin)}
                </span>
              </div>
              <p className="mt-4 leading-relaxed text-foreground/80">{cagnotte.description}</p>

              {estProprietaire && (
                <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ImagePlus className="size-4" />
                    Changer la photo de couverture
                  </h3>
                  <form onSubmit={uploaderImage} className="flex flex-col gap-3 sm:flex-row">
                    <input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => setFichierImage(e.target.files[0])} className="flex-1 text-sm" />
                    <Button type="submit" variant="outline" size="default">Envoyer</Button>
                  </form>
                </div>
              )}

              {/* Actualités */}
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-foreground">Actualités</h2>
                {estProprietaire && (
                  <form onSubmit={publierActualite} className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
                    <input
                      placeholder="Titre de l'actualité"
                      value={nouvelleActualite.titre}
                      onChange={(e) => setNouvelleActualite({ ...nouvelleActualite, titre: e.target.value })}
                      required
                      className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <textarea
                      placeholder="Contenu"
                      rows={3}
                      value={nouvelleActualite.contenu}
                      onChange={(e) => setNouvelleActualite({ ...nouvelleActualite, contenu: e.target.value })}
                      required
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <Button type="submit" className="self-start">Publier</Button>
                  </form>
                )}
                <div className="mt-4 flex flex-col gap-3">
                  {actualites.map((a) => (
                    <div key={a.id_actualite} className="rounded-xl border border-border bg-card p-5">
                      <p className="font-semibold text-foreground">{a.titre}</p>
                      <p className="mt-1 text-sm text-foreground/80">{a.contenu}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formaterDateHeure(a.date_publication)}</p>
                    </div>
                  ))}
                  {actualites.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Aucune actualité pour l'instant.</p>}
                </div>
              </section>

              {/* Commentaires */}
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-foreground">Commentaires ({commentaires.length})</h2>
                {utilisateurConnecte && (
                  <form onSubmit={posterCommentaire} className="mt-4 flex gap-2">
                    <input
                      placeholder="Écris un commentaire d'encouragement..."
                      value={nouveauCommentaire}
                      onChange={(e) => setNouveauCommentaire(e.target.value)}
                      className="h-11 flex-1 rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <Button type="submit" size="default"><Send className="size-4" /></Button>
                  </form>
                )}
                <div className="mt-4 flex flex-col gap-3">
                  {commentaires.map((c) => (
                    <div key={c.id_commentaire} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                      <p className="text-sm text-foreground"><span className="font-semibold">{c.utilisateur.prenom} : </span>{c.description}</p>
                      {utilisateurConnecte && utilisateurConnecte.id_utilisateur === c.id_utilisateur && (
                        <button onClick={() => supprimerCommentaire(c.id_commentaire)} className="shrink-0 text-xs font-medium text-destructive hover:underline">
                          Supprimer
                        </button>
                      )}
                    </div>
                  ))}
                  {commentaires.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Aucun commentaire pour l'instant.</p>}
                </div>
              </section>
            </div>

            {/* Colonne latérale */}
            <div className="flex flex-col gap-5">
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-2xl font-bold text-foreground">{formaterMontant(cagnotte.montant_collecte, cagnotte.devise)}</p>
                <p className="text-sm text-muted-foreground">sur {formaterMontant(cagnotte.objectif, cagnotte.devise)} demandés</p>

                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pourcentage}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-primary">{pourcentage}% atteint</span>
                  <span className="text-muted-foreground">{joursRestants(cagnotte.date_fin)}</span>
                </div>

                <hr className="my-5 border-border" />

                {utilisateurConnecte ? (
                  <form onSubmit={faireDon} className="flex flex-col gap-3">
                    <p className="text-sm font-semibold text-foreground">Faire un don</p>
                    <input type="number" placeholder="Montant (XAF)" value={montant} onChange={(e) => setMontant(e.target.value)} required className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <select value={methode} onChange={(e) => setMethode(e.target.value)} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                      <option value="MTN_MOBILE_MONEY">MTN Mobile Money</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                    </select>
                    <input placeholder="Numéro payeur" value={numero} onChange={(e) => setNumero(e.target.value)} required className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <Button type="submit" size="lg">Donner maintenant</Button>
                    {messageDon && <p className="text-sm text-primary">{messageDon}</p>}
                  </form>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Connecte-toi pour soutenir cette cagnotte.</p>
                    <Button to="/login" className="mt-3 w-full">Se connecter</Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                <Users className="size-4" />
                {cagnotte.id_categorie ? 'Catégorie renseignée' : 'Cagnotte solidaire'}
              </div>

              {estProprietaire && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm font-semibold text-foreground">Retraits</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Disponible : <span className="font-semibold text-primary">{formaterMontant(disponibleRetrait, cagnotte.devise)}</span>
                  </p>
                  <form onSubmit={demanderRetrait} className="mt-4 flex flex-col gap-3">
                    <input type="number" placeholder="Montant à retirer" value={montantRetrait} onChange={(e) => setMontantRetrait(e.target.value)} required className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <select value={methodeRetrait} onChange={(e) => setMethodeRetrait(e.target.value)} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                      <option value="MTN_MOBILE_MONEY">MTN Mobile Money</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                    </select>
                    <input placeholder="Numéro bénéficiaire" value={numeroRetrait} onChange={(e) => setNumeroRetrait(e.target.value)} required className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <Button type="submit" variant="outline">Demander le retrait</Button>
                  </form>
                  {retraits.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                      {retraits.map((r) => (
                        <div key={r.id_retrait} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{formaterMontant(r.montant, cagnotte.devise)}</span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">{r.statut}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}