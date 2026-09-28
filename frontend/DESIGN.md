# SoliFund — guide du style existant

Ce document décrit le style **tel qu'il est dans le code aujourd'hui**. Il sert de référence avant de
toucher un fichier `.jsx` : pour tout nouvel élément, copier les classes d'un élément équivalent
listé ici plutôt qu'en inventer.

Stack : React 19, Tailwind 4 (plugin `@tailwindcss/vite`), icônes `lucide-react`, police Inter.

---

## 1. Couleurs

### Thème Tailwind (`@theme inline` dans `src/index.css`)

C'est la seule palette à utiliser dans les nouvelles classes.

| Token | Valeur | Usage observé | Exemple |
|---|---|---|---|
| `background` | `#ffffff` | fond des pages publiques, sidebars, header | `SiteHeader.jsx` (`bg-background/90`) |
| `foreground` | `#0f2a2a` | texte principal, titres | partout (`text-foreground`) |
| `card` | `#ffffff` | fond des cartes | `Dashboard.jsx` (`bg-card`) |
| `primary` | `#0ea5a0` (teal) | boutons, liens actifs, pourcentages, montants mis en avant, barres de progression, logo | `Button.jsx`, `PopularCagnottes.jsx` |
| `primary-foreground` | `#ffffff` | texte sur fond `primary` | `Button.jsx` |
| `secondary` | `#f7f9fa` | fond de l'espace connecté, sections alternées, fond des barres de progression, survol | `DashboardLayout.jsx` (`bg-secondary`) |
| `secondary-foreground` | `#0f2a2a` | (défini, non utilisé) | — |
| `muted` | `#f7f9fa` | (défini, non utilisé en classe) | — |
| `muted-foreground` | `#5f7070` | textes secondaires, sous-titres, dates, labels de stats, messages vides | partout (`text-muted-foreground`) |
| `accent` | `#f5b942` (jaune) | statuts « en attente / suspendu », pastille du Hero | `AdminRetraits.jsx`, `Hero.jsx` |
| `accent-foreground` | `#4a3410` | texte sur fond `accent/20` | `MesCagnottes.jsx` |
| `destructive` | `#e5484d` | erreurs, suppression, déconnexion, rejet, bannissement | `CreerCagnotte.jsx`, `DashboardLayout.jsx` |
| `border` | `#e6ecec` | toutes les bordures et séparateurs | partout (`border-border`) |

Opacités récurrentes (toujours avec ces valeurs) :

- `bg-primary/10` : fond d'un badge, d'une icône ou d'un lien actif ; `bg-primary/5` + `border-primary/30` : élément « non lu » (`Notifications.jsx`).
- `bg-accent/20` : fond d'un statut en attente.
- `bg-destructive/10` : fond d'un statut négatif ou survol d'un bouton destructif ; `border-destructive/30` : bordure d'un bouton destructif ; `bg-destructive/5` : bloc d'erreur (`ListeCagnottes.jsx`).
- `focus:ring-primary/20` : halo de focus des champs.
- `text-foreground/80` : texte long (description, actualités) dans `DetailCagnotte.jsx`.
- `text-foreground/10` : grand numéro d'étape décoratif dans `HowItWorks.jsx`.

Couleurs hors thème **tolérées uniquement là où elles existent** : les logos MTN (`bg-[#FFCC00]`) et
Orange (`bg-[#FF7900]`) dans `ReassuranceBar.jsx`, et le SVG Google dans `AuthPage.jsx`.

### Ancien CSS (bloc `:root` de `src/index.css`)

`index.css` contient aussi une première version du style, avec ses propres variables (`--primaire`,
`--primaire-fonce`, `--fond`, `--texte`, `--danger`, `--succes`…) et classes (`.carte`, `.erreur`,
`.badge`, `.conteneur`, `.barre-progression`, `.nav-app`, `.stat-bloc`…). Ces classes ne sont plus
utilisées que par du code mort (voir §8). **Ne pas les utiliser dans du nouveau code.**

⚠️ Piège : `index.css` n'importe pas le preflight de Tailwind (seulement `theme.css` et
`utilities.css`), et définit des règles globales sur les balises :

- `button` : fond `--primaire`, texte blanc, `padding: 10px 20px`, `border-radius: 10px`, `font-size: 15px`,
  fond plus foncé au survol ;
- `input, textarea, select` : `padding: 10px 12px`, `margin-bottom: 12px`, bordure, `font-size: 15px` ;
- `a` : couleur `--primaire-fonce`, `font-weight: 500`, souligné au survol ;
- `h1, h2, h3` : `font-weight: 600`, `margin: 0 0 12px` (`h2` 22px, `h3` 17px).

Les classes Tailwind l'emportent sur ces règles, mais **uniquement pour les propriétés qu'elles
fixent**. Conséquence : un `<button>` « nu » (hors composant `Button`) garde le fond teal s'il n'a
pas de classe `bg-*`. C'est pour cela que les boutons de type lien/icône ajoutent `bg-transparent`
(ex. bouton Supprimer de `MesCagnottes.jsx`, bouton Déconnexion de `DashboardLayout.jsx`).
Toujours préciser `bg-transparent` (ou un autre `bg-*`) sur un `<button>` qui n'est pas un `Button`.

---

## 2. Typographie

Police : **Inter** (400, 500, 600, 700) chargée depuis Google Fonts dans `index.css`, repli `system-ui, sans-serif`.

| Rôle | Classes | Exemple |
|---|---|---|
| Titre du Hero | `text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl` | `Hero.jsx` |
| Titre de section (accueil) | `text-3xl font-bold tracking-tight text-foreground sm:text-4xl` | `HowItWorks.jsx`, `PopularCagnottes.jsx` |
| Surtitre de section | `text-sm font-semibold uppercase tracking-wider text-primary` | `HowItWorks.jsx` (« Simple et rapide ») |
| Titre de page publique | `text-3xl font-bold tracking-tight text-foreground` | `ListeCagnottes.jsx` |
| Titre de page (espace connecté / admin) | `text-2xl font-bold text-foreground` | `Dashboard.jsx`, `MesCagnottes.jsx`, `AdminRetraits.jsx` |
| Sous-titre de page | `mt-1 text-muted-foreground` | `MesCagnottes.jsx` |
| Titre de cagnotte (détail) | `text-2xl font-bold text-foreground sm:text-3xl` | `DetailCagnotte.jsx` |
| Titre de carte / bloc | `text-lg font-semibold text-foreground` | `Dashboard.jsx` (« Mes cagnottes récentes ») |
| Titre de carte de cagnotte | `text-base font-semibold leading-snug text-foreground` | `ListeCagnottes.jsx` |
| Titre de page centrée (auth) | `text-xl font-bold text-foreground` | `MotDePasseOublie.jsx` |
| Label de champ | `mb-2 block text-sm font-medium text-foreground` | `CreerCagnotte.jsx` |
| Texte courant secondaire | `text-sm text-muted-foreground` | partout |
| Texte long | `leading-relaxed text-muted-foreground` ou `leading-relaxed text-foreground/80` | `HowItWorks.jsx`, `DetailCagnotte.jsx` |
| Méta (date, aide) | `text-xs text-muted-foreground` | `Notifications.jsx`, `Compte.jsx` |
| Chiffre de statistique | `mt-2 text-3xl font-bold text-foreground` (ou `text-primary` pour un montant) | `Dashboard.jsx` |
| Montant principal (détail) | `text-2xl font-bold text-foreground` | `DetailCagnotte.jsx` |

Montants et dates : toujours via `formaterMontant`, `formaterDate`, `formaterDateHeure` de `src/utils/format.js`
(format `fr-FR`, ex. « 10 000 XAF », « 28 septembre 2026 »).

---

## 3. Classes récurrentes (à copier telles quelles)

### Cartes

- Carte standard : `rounded-xl border border-border bg-card p-6` (`Dashboard.jsx`, `CreerCagnotte.jsx` pour le `<form>`). Variante plus compacte : `p-5` (`AdminRetraits.jsx`, stats de `Dashboard.jsx`) ou `p-4` (`DetailCagnotte.jsx`, commentaires).
- Carte de cagnotte (image + contenu) :
  `group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md`
  avec l'image dans `relative aspect-[16/10] overflow-hidden bg-secondary` et
  `h-full w-full object-cover transition-transform duration-300 group-hover:scale-105` (`ListeCagnottes.jsx`, `PopularCagnottes.jsx`, `MesCagnottes.jsx`).
- État vide : `rounded-xl border border-dashed border-border bg-card p-12 text-center` (`MesCagnottes.jsx`, `Notifications.jsx`, `AdminRetraits.jsx`).
- Élément de liste cliquable dans une carte : `flex items-center gap-4 rounded-lg border border-border p-3 hover:bg-secondary` (`Dashboard.jsx`).
- Élément « non lu » / « lu » : `rounded-xl border p-4` + `border-primary/30 bg-primary/5` ou `border-border bg-card` (`Notifications.jsx`).
- Carte centrée (pages hors layout) : `w-full max-w-md rounded-2xl border border-border bg-card p-8` sur un fond `flex min-h-screen items-center justify-center bg-secondary px-4` (`MotDePasseOublie.jsx`).

Ombres : seulement `shadow-sm` (repos), `hover:shadow-md` (cartes cliquables) et `shadow-lg` (Hero). Rien de plus marqué.

### Champs de formulaire

- `input` / `select` :
  `h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20` (`CreerCagnotte.jsx`)
- `textarea` :
  `w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20` (`CreerCagnotte.jsx`)
- Champ avec icône à gauche : remplacer `px-3` par `pl-9`, dans un `<div className="relative">` avec l'icône
  `pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground` (`Compte.jsx`, `ListeCagnottes.jsx`).
- Champ mot de passe avec œil : `pl-9 pr-9`, bouton `absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground` (`ChampMotDePasse` dans `AuthPage.jsx`).
- Champ désactivé : `h-11 w-full cursor-not-allowed rounded-xl border border-border bg-secondary pl-9 text-sm text-muted-foreground` (`Compte.jsx`).
- Préfixe collé : `inline-flex h-11 shrink-0 items-center rounded-xl border border-border bg-secondary px-3 text-sm font-medium text-foreground` (« +237 » dans `AuthPage.jsx`).
- Champ compact (admin) : `h-10 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20` (`AdminRetraits.jsx`).
- Zone d'upload : `flex aspect-[16/7] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-primary` (`CreerCagnotte.jsx`).
- Mise en page : `<form className="... flex flex-col gap-5 ...">`, deux champs côte à côte dans `grid grid-cols-1 gap-5 sm:grid-cols-2` (`CreerCagnotte.jsx`). Dans les pages d'auth : `flex flex-col gap-4`, chaque champ dans `flex flex-col gap-2` (`AuthPage.jsx`).

### Badges de statut

Forme : `rounded-full px-2.5 py-1 text-xs font-semibold` (`AdminUtilisateurs.jsx`) ou `rounded-full px-3 py-1 text-xs font-semibold` sur une image (`MesCagnottes.jsx`). Avec icône : `inline-flex items-center gap-1` + icône `size-3` (`AdminRetraits.jsx`).

Couleurs (copier l'objet `statutStyles` du fichier correspondant) :

| Sens | Classes | Statuts |
|---|---|---|
| Positif / actif | `bg-primary/10 text-primary` | `ACTIVE`, `ACTIF`, `APPROUVE`, `TRAITE`, rôle Admin |
| En attente / suspendu | `bg-accent/20 text-accent-foreground` | `EN_ATTENTE`, `SUSPENDUE`, `SUSPENDU` |
| Négatif | `bg-destructive/10 text-destructive` | `ANNULEE`, `REJETE`, `BANNI` |
| Neutre | `bg-secondary text-muted-foreground` | `TERMINEE`, `INACTIF` |

Sources : `MesCagnottes.jsx`, `AdminRetraits.jsx`, `AdminUtilisateurs.jsx`.
Badge de catégorie sur image : `absolute left-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-primary shadow-sm` (`ListeCagnottes.jsx`).
Pastille de compteur : `ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground` (`DashboardLayout.jsx`).
Pastille d'annonce : `inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary` (`Hero.jsx`).

### Messages

- Erreur sous un champ : `<p className="mt-1 text-xs text-destructive">` (`CreerCagnotte.jsx`) ; dans les formulaires d'auth, sans `mt-1` (`AuthPage.jsx`).
- Erreur de formulaire (retour serveur) : `<p className="text-sm text-destructive">{err.messageAffichable}</p>` (`CreerCagnotte.jsx`, `AuthPage.jsx`).
- Erreur de chargement avec relance : `mt-10 flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center` + `<Button variant="outline">Réessayer</Button>` (`ListeCagnottes.jsx`).
- Succès : `<p className="text-sm text-primary">` (`Compte.jsx`, `DetailCagnotte.jsx`).
- Chargement : simple texte `<p className="text-muted-foreground">Chargement...</p>` (`Dashboard.jsx`, `MesCagnottes.jsx`).
- Le texte d'erreur affiché vient toujours de `err.messageAffichable`, préparé par l'intercepteur de `src/api/axios.js`.
- Confirmation d'action destructive : `window.confirm(...)` (`MesCagnottes.jsx`, `AdminUtilisateurs.jsx`). Pas de modale.

### Séparateurs

- Dans une carte : `<hr className="my-5 border-border" />` (`DetailCagnotte.jsx`).
- Au-dessus d'un groupe d'actions : `mt-4 ... border-t border-border pt-4` (`AdminRetraits.jsx`) ; bas de sidebar : `border-t border-border px-3 py-4` (`DashboardLayout.jsx`).
- Séparateur « ou » : composant local `Diviseur` dans `AuthPage.jsx` (`h-px flex-1 bg-border` de chaque côté d'un `text-xs font-medium uppercase tracking-wide text-muted-foreground`).
- Sections de page : bordures `border-b border-border` (header), `border-y border-border` (`ReassuranceBar.jsx`).

### Listes, grilles et tableaux

- Liste verticale de cartes : `flex flex-col gap-3` (`Notifications.jsx`, `AdminRetraits.jsx`).
- Grille de cagnottes : `grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4` (public, `ListeCagnottes.jsx`) ; `grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3` (espace connecté, `MesCagnottes.jsx`).
- Grille de statistiques : `grid grid-cols-1 gap-4 sm:grid-cols-3` (`Dashboard.jsx`).
- Tableau : conteneur `overflow-x-auto rounded-xl border border-border bg-card`, `table w-full text-left text-sm`, `thead border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground`, cellules `px-4 py-3`, lignes `border-b border-border last:border-0` (`AdminUtilisateurs.jsx`).
- Filtres en pilules : `rounded-full px-4 py-1.5 text-sm font-medium transition-colors` + `bg-primary text-primary-foreground` (actif) ou `bg-card text-muted-foreground hover:bg-secondary` (`AdminRetraits.jsx`).
- Onglets : `grid h-11 w-full grid-cols-2 rounded-xl bg-secondary p-1`, onglet `rounded-lg text-sm font-medium transition-colors` + `bg-background text-primary shadow-sm` si actif (`AuthPage.jsx`).
- Barre de progression : `h-2 w-full overflow-hidden rounded-full bg-secondary` + `h-full rounded-full bg-primary` avec `style={{ width: \`${percent}%\` }}` (`ListeCagnottes.jsx`) ; `h-1.5` en compact (`Dashboard.jsx`), `h-2.5` sur le détail (`DetailCagnotte.jsx`).

### Liens

- Lien d'action : `text-sm font-medium text-primary hover:underline` (`AuthPage.jsx`), avec flèche : `flex items-center gap-1 text-sm font-medium text-primary hover:underline` + `<ArrowRight className="size-3.5" />` (« Voir tout », `Dashboard.jsx`).
- Lien de retour : `inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary` + `ArrowLeft size-4` (`AuthPage.jsx`).
- Petit bouton d'action secondaire (bordé) : `flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary` (`DetailCagnotte.jsx`, `Notifications.jsx`).
- Petit bouton destructif : même forme avec `border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10` (`MesCagnottes.jsx`, `DetailCagnotte.jsx`).
- Bouton icône (admin) : `rounded-lg p-1.5 text-primary hover:bg-primary/10` (ou `text-accent-foreground hover:bg-accent/20`, `text-destructive hover:bg-destructive/10`) avec `title` (`AdminUtilisateurs.jsx`).

### Conteneurs de page

- Pages publiques : `mx-auto max-w-[1400px] px-4 sm:px-6` + `py-10` / `py-16 lg:py-24` (`ListeCagnottes.jsx`, `HowItWorks.jsx`).
- Formulaires de l'espace connecté : `mx-auto max-w-2xl` (`CreerCagnotte.jsx`, `Compte.jsx`, `Notifications.jsx`).
- En-tête de page avec bouton : `flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center` (`MesCagnottes.jsx`).
- Espacement vertical des blocs d'une page : `flex flex-col gap-6` ou `gap-8` (`MesCagnottes.jsx`, `Dashboard.jsx`).

### Logo

Toujours le même assemblage (`SiteHeader.jsx`, `SiteFooter.jsx`, `DashboardLayout.jsx`) :
`flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground` + `<HeartHandshake className="size-5" />`, puis
`text-lg font-bold tracking-tight text-foreground` avec `Soli<span className="text-primary">fund</span>`.

---

## 4. Composants réutilisables

| Composant | Fichier | Quand l'utiliser |
|---|---|---|
| `Button` | `src/components/ui/Button.jsx` | **Tout bouton d'action principal ou secondaire.** Variantes : `default` (plein teal), `outline` (bord `primary/30`, texte teal), `ghost` (texte, fond au survol). Tailles : `default` (`h-10 px-4 text-sm`), `lg` (`h-12 px-7 text-base`). Avec `to="/chemin"` il rend un `<Link>`. Les icônes se placent comme enfants (gap déjà prévu). Hauteur forcée à `h-11` dans les formulaires d'auth (`AuthPage.jsx`). Pour une variante destructive, ajouter `className="border-destructive/30 text-destructive hover:bg-destructive/10"` sur `variant="outline"` (`AdminRetraits.jsx`). |
| `SiteHeader` | `src/components/site/SiteHeader.jsx` | En tête de toute page publique (accueil, liste, détail de cagnotte). Sticky, menu mobile intégré. |
| `SiteFooter` | `src/components/site/SiteFooter.jsx` | En bas des pages publiques, avec `SiteHeader`. Structure : `<div className="flex min-h-screen flex-col bg-background"><SiteHeader /><main className="flex-1">…</main><SiteFooter /></div>` (`ListeCagnottes.jsx`). |
| `DashboardLayout` | `src/components/dashboard/DashboardLayout.jsx` | Toute page de l'espace connecté (dashboard, mes cagnottes, créer/modifier, notifications, profil). Sidebar `w-64`, fond `bg-secondary`, contenu `p-4 sm:p-6 lg:p-10`. Un nouveau lien de navigation s'ajoute dans `liensNav`. |
| `AdminLayout` | `src/components/admin/AdminLayout.jsx` | Pages `/admin/*`, avec `AdminRoute`. Même structure que `DashboardLayout` ; nouveau lien dans `liensNav`. |
| `Hero`, `ReassuranceBar`, `HowItWorks`, `PopularCagnottes` | `src/components/site/` | Sections de la page d'accueil uniquement (`Accueil.jsx`). |
| `RouteProtegee` / `AdminRoute` | `src/components/` | Encapsuler une route qui exige une connexion / le rôle admin (`App.jsx`). |

Composants locaux réutilisables par copie : `ChampMotDePasse` et `Diviseur` (`AuthPage.jsx`), `CagnotteCard` (`ListeCagnottes.jsx`, `PopularCagnottes.jsx`).

---

## 5. Icônes

Bibliothèque unique : **`lucide-react`**, taille fixée par `size-*` (jamais `width`/`height`).

| Taille | Usage | Exemple |
|---|---|---|
| `size-3` | icône dans un badge de statut | `AdminRetraits.jsx` |
| `size-3.5` | petits boutons (Modifier, Supprimer), méta de carte, flèche « Voir tout » | `MesCagnottes.jsx`, `ListeCagnottes.jsx` |
| `size-4` | **taille par défaut** : icônes dans les boutons, les champs, les liens | `Dashboard.jsx`, `Compte.jsx` |
| `size-4.5` | liens de navigation des sidebars | `DashboardLayout.jsx` |
| `size-5` | logo, menu mobile, bouton `lg`, icône Google | `SiteHeader.jsx`, `Hero.jsx` |
| `size-6` | icône d'étape dans une pastille `size-12 rounded-xl bg-primary/10 text-primary` | `HowItWorks.jsx` |
| `size-7` / `size-8` | grande icône d'état vide ou de page 404 | `NonTrouve.jsx`, `Notifications.jsx`, `CreerCagnotte.jsx` |

Icônes déjà associées à un sens : `HeartHandshake` (logo), `PlusCircle` (créer), `Pencil` (modifier), `Trash2` (supprimer),
`Wallet` (cagnottes/retraits), `Bell` (notifications), `ShieldCheck` (sécurité, administration), `LogOut`, `ArrowLeft` (retour),
`ArrowRight` (voir plus), `Users`, `Calendar`, `Mail`, `Lock`, `Phone`, `User`, `Eye`/`EyeOff`, `CheckCircle2`/`XCircle`/`Clock` (statuts de retrait).

---

## 6. Ton des textes

- **Espace connecté, formulaires, messages : tutoiement.** « Voici un aperçu de ton activité sur Solifund. » (`Dashboard.jsx`),
  « Gère toutes les cagnottes que tu as créées. » (`MesCagnottes.jsx`), « Connecte-toi pour soutenir cette cagnotte. » (`DetailCagnotte.jsx`).
- **Attention, incohérence existante :** les pages marketing vouvoient (« Réalisez vos projets… » dans `Hero.jsx`,
  « Créez votre cagnotte » dans `HowItWorks.jsx`, « Connectez-vous ou créez un compte… » et placeholder « vous@exemple.com » dans `AuthPage.jsx`).
  Pour tout nouveau texte, utiliser le tutoiement.
- Phrases courtes, concrètes, terminées par un point. Titres sans point.
- **Messages vides** : « Aucun(e) … pour l'instant. » ou une phrase qui pousse à agir.
  Ex. « Aucune notification pour l'instant. » (`Notifications.jsx`), « Aucune cagnotte ne correspond à ta recherche. » (`ListeCagnottes.jsx`),
  « Tu n'as pas encore de cagnotte. Lance-toi ! » (`Dashboard.jsx`), « Tu es à jour. » (`Notifications.jsx`).
- **Erreurs de validation** : factuelles, sans formule d'excuse. « Le titre est requis. », « La date de fin doit être après la date de début. »
  (`CreerCagnotte.jsx`), « Les mots de passe ne correspondent pas. » (`AuthPage.jsx`).
- **Erreurs serveur** : le message renvoyé par l'API (`err.messageAffichable`) ; sinon « Impossible de joindre le serveur. Vérifie ta connexion. »
  ou « Une erreur est survenue. » (`src/api/axios.js`).
- **Boutons** : verbe à l'infinitif ou possessif. « Créer ma cagnotte », « Enregistrer », « Donner maintenant », « Demander le retrait », « Réessayer ».
  Pendant l'envoi : « Création en cours... », « Enregistrement... », « Envoi en cours... ».
- **Confirmations** : question directe. « Supprimer définitivement cette cagnotte ? Cette action est irréversible. » (`MesCagnottes.jsx`).
- Montants toujours avec la devise (`XAF`), moyens de paiement nommés « MTN Mobile Money » et « Orange Money ».

---

## 7. À ne pas reproduire

Ces éléments existent mais ne doivent pas servir de modèle :

- **Emojis** comme icônes de notification (`💰`, `🏦`, `💬`… dans `Notifications.jsx`) : utiliser une icône lucide à la place.
- **Cercles flous décoratifs** (`blur-2xl`) du panneau gauche de `AuthPage.jsx` : propres à cette page.
- `alert(...)` du bouton Google (`AuthPage.jsx`).
- Les classes et variables de l'ancien CSS (`.carte`, `.erreur`, `.badge`, `var(--primaire)`…).
- Les statuts affichés en brut (`{c.statut}`, ex. « EN_ATTENTE ») : c'est le comportement actuel, mais un libellé en français serait préférable si la tâche le demande.

## 8. Code mort (repéré lors de l'analyse)

Non supprimé, simplement signalé :

- `src/components/MessageErreur.jsx`, `src/components/Spinner.jsx` : importés nulle part (basés sur l'ancien CSS).
- Les classes `.nav-app*` de `index.css` : plus utilisées depuis la suppression de l'ancien composant `Nav`.

(`App.css`, `pages/Login.jsx`, `pages/Inscription.jsx` et le composant `Nav` de `App.jsx` ont été supprimés.)
