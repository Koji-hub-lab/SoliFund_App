# Charte graphique SoliFund
Ambiance : chaleureuse et festive, mais sobre. Une seule couleur forte (Lagune) et un seul accent (Ambre).
Référence culturelle : le njangi (tontine camerounaise), exprimée par le logo et un motif wax discret.

## Couleurs
- Lagune #087F7A (primary) : marque, boutons principaux, liens, barres de progression.
- Lagune foncée #055955 (primary-dark) : relief des boutons, survol.
- Lagune claire #E3F2F0 (primary-soft) : fonds de section, badges, fond des barres de progression.
- Ambre #E9A23B (accent), texte Encre dessus : UNIQUEMENT pour le bouton « Faire un don » / « Soutenir »
  sur la page d'une cagnotte. Ambre foncé #C4822A pour son relief. Ambre clair #FBEBD0 (texte #7A5312)
  pour le badge « Plus que X jours ».
- Encre #17262A (foreground) : textes, bloc « confiance », pied de page. Texte sur Encre : #FBF7F1,
  texte secondaire sur Encre : #B9C6C4, turquoise sur Encre : #5CC9C2.
- Sable #FBF7F1 (background) : fond de toutes les pages. Cartes en blanc #FFFFFF.
- Bordures #ECE4D8. Texte secondaire #5E6B6D. Texte de paragraphe #45524F.

## Typographie
- Titres : Bricolage Grotesque, graisse 700–800, interlettrage négatif (-0.03em sur les grands titres).
  H1 accueil 72px, titres de section 52px, titres de carte 20–26px.
- Texte : DM Sans (400, 500, 700). Paragraphes 17–20px, interligne 1.6.
- Petit sur-titre de section : 14px, gras, majuscules, interlettrage 0.12em, couleur Lagune.

## Formes
- Boutons et badges : pilules (rounded-full). Cartes : rayon 28px. Grands blocs : rayon 32–40px.
- Bouton principal : fond Lagune, texte blanc, hauteur 48–60px, relief « box-shadow: 0 3px 0 #055955 »,
  qui s'enfonce au clic (translate-y de 2px et relief réduit).
- Bouton secondaire : bordure 2px Lagune, texte Lagune, fond transparent.
- Bouton désactivé : fond #ECE4D8, texte #8C9596.
- Liens : Lagune, gras, souligné épais (2px) avec décalage 5px.
- Cartes : fond blanc, bordure 1px #ECE4D8, pas d'ombre (une ombre douce seulement pour les éléments
  flottants posés sur une photo).
- Barres de progression : 10px de haut, fond Lagune claire, remplissage Lagune, bouts arrondis.

## Motif wax
Toujours ton sur ton, jamais multicolore : fond Lagune avec motifs #2E9C96, ou fond Lagune claire
avec motifs #C3E4E0. Utilisations : fin liseré de séparation (24px), fond décoratif derrière la photo du hero.

## Logo
Le cercle njangi : 6 cercles Lagune disposés en cercle autour d'un cercle central Ambre.
Wordmark « Soli » en Encre + « Fund » en Lagune, Bricolage Grotesque 800.
Sur fond sombre : cercles #5CC9C2, centre Ambre, wordmark #FBF7F1.
Composant : src/components/Logo.jsx.

## Composants
Toujours partir de ces composants plutôt que de recréer un style. Chemins relatifs à `src/`.

### Marque
- **Logo** (`components/Logo.jsx`) : cercle njangi + wordmark. `variante="couleur"` sur fond clair, `"clair"` sur fond
  Encre ou photo ; `avecTexte={false}` pour le symbole seul. `SymboleNjangi` (même fichier) pour le symbole en
  décoration (appel final, états vides, 404, absence de photo).
- **LisereWax** (`components/site/LisereWax.jsx`) : liseré de 24 px entre deux sections. `MotifWax` (même fichier)
  remplit un conteneur de motif ton sur ton (`palette="lagune"` ou `"clair"`) : carré du hero, cercle des cartes Lagune.

### Actions
- **Button** (`components/ui/Button.jsx`), toujours en pilule. Rendu en `<button>`, en lien interne (`to`) ou en ancre (`href`).
  - `default` : action principale d'un écran (un seul par zone).
  - `outline` : action secondaire (« Voir », « Annuler », pagination).
  - `danger` : action destructive (« Rejeter », « Suspendre », « Bannir », « Annuler la cagnotte »).
  - `don` (Ambre) : UNIQUEMENT le bouton de don de la page d'une cagnotte.
  - `ghost` : action discrète sans bordure.
  - Tailles : `sm` (44 px sur mobile, 40 px au-delà, listes compactes), `default` (48 px), `lg` (56 px, formulaires
    et appels à l'action), `xl` (60 px, bouton de don).
- **Confirmation** (`components/ui/Confirmation.jsx`) : fenêtre de confirmation (`<dialog>`) avant toute action
  sensible ou irréversible. Prop `motif` quand un motif est demandé (obligatoire ou facultatif). Jamais `window.confirm`.

### Formulaires
- **Champ** (`components/ui/Champ.jsx`) : libellé + champ + erreur (+ aide) pour tous les formulaires ; `as="select"` ou
  `as="textarea"`, `prefixe` (ex. « +237 »), `suffixe` (bouton dans le champ). Champ de 52 px, bordure 2 px, rayon 16 px.
- **ChampMotDePasse** (`components/auth/ChampMotDePasse.jsx`) : champ mot de passe avec bouton afficher / masquer.
- **SaisieCode** (`components/ui/SaisieCode.jsx`) : code à 6 chiffres en cases (vérification d'email, mot de passe oublié).
- **ChoixOperateur** (`components/cagnotte/ChoixOperateur.jsx`) : cartes MTN / Orange pour choisir l'opérateur (don, retrait).
- Numéros de téléphone : valider avec `normaliserNumero` (`utils/telephone.js`).

### Contenu
- **CarteCagnotte** (`components/cagnotte/CarteCagnotte.jsx`) : carte publique d'une cagnotte (accueil, liste),
  entièrement cliquable. `CarteCagnotteSquelette` pendant le chargement.
- **CarteCagnotteOrganisateur** (`components/dashboard/CarteCagnotteOrganisateur.jsx`) : ligne de cagnotte vue par son
  organisateur, avec « Gérer » (tableau de bord, « Mes cagnottes »).
- **CarteChiffre** (`components/ui/CarteChiffre.jsx`) : chiffre clé d'un tableau de bord ; `teinte` `blanche`, `lagune`
  (le chiffre principal, avec cercle wax) ou `ambre` (ce qui demande une action).
- **BarreProgression** (`components/BarreProgression.jsx`) : progression d'une collecte (10 px par défaut, `hauteur` pour
  8 ou 12 px).
- **ElementActivite** (`components/dashboard/ElementActivite.jsx`) : une notification (icône selon le type, point Ambre
  si non lue).
- **PastilleInitiale** (`components/cagnotte/PastilleInitiale.jsx`) : pastille ronde avec l'initiale d'une personne
  (cœur pour un don anonyme).
- **Badges de statut** (`utils/statuts.jsx`) : `BadgeStatut` avec `statutsRetrait`, `statutsCagnotte` ou
  `statutsUtilisateur` pour tout statut affiché. `badgeStatutCagnotte` / `badgeEtatCagnotte` (`utils/cagnotte.js`)
  pour les badges calculés (« Plus que X jours », « Objectif atteint », « Terminée »).

### Mises en page et états
- **EspaceLayout** (`components/layout/EspaceLayout.jsx`) : barre latérale Encre des espaces connectés, via
  `DashboardLayout` (organisateur) ou `AdminLayout` (administration).
- **SiteHeader / SiteFooter** (`components/site/`) : en-tête et pied de page des pages publiques.
- **MiseEnPageAuth** (`components/auth/MiseEnPageAuth.jsx`) : connexion, inscription, mot de passe oublié.
- **Squelettes** (`components/ui/Squelette.jsx`) : `SqueletteEnTete`, `SqueletteChiffres`, `SqueletteListe`,
  `SqueletteFormulaire`, `SqueletteCagnotte` pendant le chargement d'une page. Jamais d'indicateur tournant ; dans un
  bouton, changer seulement son texte (« Envoi en cours... »).

## Accessibilité
- Focus clavier : anneau Lagune de 3 px (réglé globalement dans `index.css`) ; les champs gardent leur bordure Lagune.
- Toute image porte un `alt` (vide si elle est décorative) ; tout champ a un libellé (`Champ`, `<label>` ou `aria-label`).
- Cibles tactiles d'au moins 44 px de haut sur mobile (liens isolés compris : `inline-flex min-h-11 items-center`).
- Animations : `motion-safe:` pour les effets de survol ; `prefers-reduced-motion` coupe les animations globalement.
