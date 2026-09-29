# Audit SoliFund — backend et frontend

Date : 29 septembre 2026. Audit en lecture seule : aucun fichier de code n'a été modifié.

Légende : 🔴 bloquant · 🟠 important · 🟡 mineur.
Chaque point a été vérifié dans le code. Quand un point est déduit du code sans avoir été reproduit en l'exécutant, c'est indiqué (« non exécuté »). Les incertitudes sont signalées explicitement.

Le module `backend/src/payment/` n'est **pas** audité en détail, car il va être remplacé. Seuls sont signalés les endroits du reste du code qui en dépendent (A1, A8 et la section finale).

---

## 0. Résultat des commandes

| Commande | Résultat |
|---|---|
| `backend/ npm run build` | ✅ OK (recrée `dist/`) |
| `backend/ npm run lint` | ❌ 257 erreurs, 28 avertissements (voir A21). Lancé **sans `--fix`** (`npx eslint "{src,apps,libs,test}/**/*.ts"`), car le script npm contient `--fix` et aurait modifié des fichiers. |
| `backend/ npm run test` | ✅ 2/2 passent. Ce sont les deux tests générés par Nest ; aucun ne teste la logique métier (voir A9). |
| `frontend/ npm run build` | ✅ OK (un seul bundle JS de 422,53 kB) |
| `frontend/ npm run lint` | ❌ oxlint plante avec « Bus error (core dumped) », code 135, reproductible (voir A20). |

---

## 1. Problèmes, du plus grave au moins grave

### 🔴 A1 — Le webhook de paiement valide des dons sans aucune authentification
- **Catégorie** : sécurité (dépendance au module de paiement)
- **Fichiers** : [payment.controller.ts:8-11](../backend/src/payment/payment.controller.ts#L8-L11) → [dons.service.ts:106-119](../backend/src/dons/dons.service.ts#L106-L119)
- **Constat** : `POST /payment/webhook/aangaraa` est public. Il ne vérifie ni signature, ni secret partagé, ni IP. Il transmet `body.transaction_id` et `body.status` à `DonsService.gererWebhookPaiement`, qui les croit sur parole. Avec `status: "SUCCESSFUL"`, le don passe VALIDE et `montant_collecte` augmente, sans qu'aucun argent n'ait été reçu. L'organisateur peut ensuite demander un retrait sur ce montant.
- **Reproduction** (non exécutée) : `curl -X POST :3000/payment/webhook/aangaraa -H 'Content-Type: application/json' -d '{"transaction_id":"<id existant>","status":"SUCCESSFUL"}'`.
- **Incertitude** : il faut connaître un `transaction_id` existant. La réponse de `POST /dons` ne le contient pas : l'objet est renvoyé avant l'enregistrement de `transaction_id`, [dons.service.ts:65-70](../backend/src/dons/dons.service.ts#L65-L70). Je n'ai pas vérifié si le format des identifiants du fournisseur est devinable.
- **Correction** : au remplacement du fournisseur, vérifier la signature du webhook ; et, dans `gererWebhookPaiement`, confirmer le statut auprès du fournisseur (comme le fait `verifierStatutDon`) au lieu de croire le corps de la requête.

### 🟠 A2 — Enregistrer son profil efface le numéro de téléphone
- **Catégorie** : incohérence de données
- **Fichiers** : [auth.service.ts:52-61](../backend/src/auth/auth.service.ts#L52-L61), [Compte.jsx:21](../frontend/src/pages/Compte.jsx#L21), [Compte.jsx:34](../frontend/src/pages/Compte.jsx#L34), [utilisateurs.service.ts:60-64](../backend/src/utilisateurs/utilisateurs.service.ts#L60-L64)
- **Constat** : la réponse de connexion ne contient pas `telephone`, et aucune route `GET /utilisateurs/moi` ne permet de le relire. Le champ Téléphone de la page Compte est donc toujours vide. Au clic sur « Enregistrer », le frontend envoie `telephone: ''`, et le backend l'écrit tel quel. Le numéro saisi à l'inscription est perdu.
- **Reproduction** : s'inscrire avec un téléphone, se connecter, ouvrir /compte (champ vide), changer seulement le prénom et enregistrer. En base, `telephone` vaut alors `''`.
- **Correction** : renvoyer `telephone` au login (ou ajouter `GET /utilisateurs/moi`, qui réglerait aussi A15), et côté backend ignorer ou convertir en `null` les chaînes vides.

### 🟠 A3 — On peut changer le mot de passe sans fournir l'ancien
- **Catégorie** : sécurité
- **Fichiers** : [update-utilisateur.dto.ts](../backend/src/utilisateurs/dto/update-utilisateur.dto.ts), [utilisateurs.service.ts:66-68](../backend/src/utilisateurs/utilisateurs.service.ts#L66-L68)
- **Constat** : `PATCH /utilisateurs/moi` accepte `mot_de_passe` avec le seul jeton JWT. Quelqu'un qui obtient un jeton (poste partagé, XSS, voir A25) peut prendre le compte définitivement. Les jetons déjà émis restent valides après le changement.
- **Correction** : exiger `ancien_mot_de_passe` vérifié avec bcrypt pour changer le mot de passe, et idéalement invalider les anciens jetons (par exemple un champ `date_changement_mdp` comparé à `iat`).

### 🟠 A4 — Connexion Google : bouton factice, rien côté backend
- **Catégorie** : connexion Google / fonctionnalité incomplète
- **Fichiers** : [AuthPage.jsx:32-44](../frontend/src/pages/AuthPage.jsx#L32-L44) (bouton, affiché aux lignes 239 et 275 environ)
- **Constat** : le bouton « Continuer avec Google » affiche seulement une alerte (`alert`, ligne 39). Rien d'autre n'existe :
  - aucune stratégie passport-google ni route `/auth/google` ou callback ; seuls `passport` et `passport-jwt` sont installés ;
  - aucune variable `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` ou d'URL de callback dans la validation de la configuration ;
  - aucun champ Prisma pour lier un compte Google (`Utilisateur.mot_de_passe` est obligatoire) ;
  - aucune page frontend pour recevoir le retour de Google.
- **Correction** : soit retirer le bouton avant la mise en ligne, soit implémenter le flux complet. Il comprend :
  - la stratégie OAuth et ses variables d'environnement ;
  - `google_id` et `mot_de_passe` facultatif dans Prisma, avec une migration ;
  - la route de callback qui émet le JWT ;
  - la page frontend qui le stocke ;
  - la décision sur la fusion avec un compte existant portant le même e-mail.

### 🟠 A5 — Les listes publiques d'une cagnotte ne vérifient pas sa visibilité
- **Catégorie** : sécurité / confidentialité
- **Fichiers** : [dons.service.ts:194-196](../backend/src/dons/dons.service.ts#L194-L196), [commentaires.service.ts:20-22](../backend/src/commentaires/commentaires.service.ts#L20-L22), [actualites.service.ts:35-40](../backend/src/actualites/actualites.service.ts#L35-L40)
- **Constat** : `GET /cagnottes/:id` masque bien les cagnottes privées, suspendues ou annulées (`trouverVisible`). Mais `GET /dons/cagnotte/:id`, `GET /commentaires/cagnotte/:id` et `GET /actualites/cagnotte/:id` répondent pour n'importe quel identifiant. On y lit les donateurs non anonymes et leurs montants, les commentaires et les actualités d'une cagnotte privée ou suspendue par la modération.
- **Reproduction** (non exécutée) : appeler `GET /dons/cagnotte/<id d'une cagnotte privée>` sans être connecté.
- **Correction** : dans ces trois services, réutiliser la règle de `CagnottesService.trouverVisible` (avec `OptionalJwtAuthGuard` pour laisser l'accès au propriétaire et à l'admin).

### 🟠 A6 — Commentaires : aucune vérification de la cagnotte ni du contenu
- **Catégorie** : logique métier / gestion d'erreurs
- **Fichiers** : [commentaires.service.ts:10-18](../backend/src/commentaires/commentaires.service.ts#L10-L18), [create-commentaire.dto.ts](../backend/src/commentaires/dto/create-commentaire.dto.ts)
- **Constat** : `creer` insère directement, sans lire la cagnotte. Conséquences :
  - on peut commenter une cagnotte privée, suspendue ou annulée ;
  - un `id_cagnotte` inexistant provoque une violation de clé étrangère, donc une erreur 500 et non 404 (déduit du code, non exécuté) ;
  - `description` n'a ni `IsNotEmpty` ni `MaxLength` : un commentaire vide ou de plusieurs mégaoctets est accepté.
- **Correction** : charger la cagnotte avec la règle de visibilité, renvoyer 404 si elle est absente, refuser les statuts SUSPENDUE et ANNULEE, et ajouter `@IsNotEmpty()` et `@MaxLength(1000)` (par exemple).

### 🟠 A7 — Passage en ECHOUE non conditionnel : un don validé peut redevenir « échoué »
- **Catégorie** : incohérence de données
- **Fichiers** : [dons.service.ts:97-100](../backend/src/dons/dons.service.ts#L97-L100), [dons.service.ts:115-118](../backend/src/dons/dons.service.ts#L115-L118)
- **Constat** : la validation est protégée (`updateMany … where statut: 'EN_ATTENTE'`). Le chemin d'échec, lui, fait deux `update` sans condition ni transaction. Si une validation passe entre la lecture et l'écriture (webhook et vérification manuelle simultanés), le don repasse ECHOUE alors que `montant_collecte` a déjà été augmenté. Le total de la cagnotte ne correspond alors plus à ses dons.
- **Incertitude** : cela suppose que le fournisseur renvoie des statuts contradictoires ou que les appels se croisent. C'est peu probable, mais les conséquences sont financières.
- **Correction** : faire comme pour la validation : `updateMany` avec `where: { statut: 'EN_ATTENTE' }` pour le don et le paiement, dans une transaction.

### 🟠 A8 — Un don peut rester « EN_ATTENTE » à vie si l'initiation du paiement échoue
- **Catégorie** : incohérence de données (dépendance au module de paiement)
- **Fichier** : [dons.service.ts:33-70](../backend/src/dons/dons.service.ts#L33-L70)
- **Constat** : le don et le paiement sont créés dans une transaction, puis `paymentService.initierPaiement` est appelé en dehors. S'il lève une erreur, le don reste EN_ATTENTE sans `transaction_id`, et `verifierStatutDon` renverra toujours EN_ATTENTE. Aucune tâche ne nettoie ces dons, et ils apparaissent dans `GET /dons` (admin).
- **Correction** : en cas d'échec de l'initiation, passer le don et le paiement en ECHOUE (try/catch autour de l'appel) ; à prévoir dans le nouveau module.

### 🟠 A9 — Les tests automatisés ne couvrent aucune règle métier
- **Catégorie** : préparation à la production
- **Fichiers** : [app.controller.spec.ts](../backend/src/app.controller.spec.ts), [prisma.service.spec.ts](../backend/src/prisma/prisma.service.spec.ts), [test/app.e2e-spec.ts](../backend/test/app.e2e-spec.ts)
- **Constat** : les seuls tests sont ceux générés par Nest (« Hello World! »). Les retraits, les dons, la visibilité et l'authentification ne sont couverts que par le script manuel `scripts/test-retraits.ts`, qui a besoin d'un backend lancé.
- **Correction** : ajouter des tests e2e sur une base de test, en priorité sur les retraits, la validation des dons et la visibilité.

### 🟡 A10 — Modifier une cagnotte suspendue ou annulée reste possible
- **Catégorie** : logique métier
- **Fichier** : [cagnottes.service.ts:173-207](../backend/src/cagnottes/cagnottes.service.ts#L173-L207)
- **Constat** : `modifier` vérifie le propriétaire, les dates et l'objectif, mais pas le statut. Un organisateur peut changer le texte d'une cagnotte SUSPENDUE par la modération ; l'admin qui la réactive publie alors un contenu qu'il n'a pas relu. Autre effet : repousser `date_fin` d'une cagnotte TERMINEE ne la réactive pas, ce qui peut dérouter.
- **Correction** : refuser la modification si le statut est SUSPENDUE ou ANNULEE, et décider explicitement du cas TERMINEE.

### 🟡 A11 — Actualités publiables sur une cagnotte annulée ou suspendue ; champs sans limite de longueur
- **Catégorie** : logique métier / gestion d'erreurs
- **Fichiers** : [actualites.service.ts:13-32](../backend/src/actualites/actualites.service.ts#L13-L32), [create-actualite.dto.ts](../backend/src/actualites/dto/create-actualite.dto.ts), [create-cagnotte.dto.ts:11-12](../backend/src/cagnottes/dto/create-cagnotte.dto.ts#L11-L12)
- **Constat** :
  - aucune vérification du statut à la publication d'une actualité ;
  - plus largement, aucun DTO n'utilise `MaxLength`. Or `titre` est en `VarChar(255)` (cagnotte et actualité) : un titre de 256 caractères provoque une erreur Prisma, donc une erreur 500 (déduit du code, non exécuté) ;
  - `nom` et `prenom` (profil) acceptent une chaîne vide.
- **Correction** : ajouter `@MaxLength` selon le schéma et `@IsNotEmpty` sur les champs obligatoires, et refuser les actualités sur les cagnottes SUSPENDUE ou ANNULEE.

### 🟡 A12 — Pas de filtre d'exceptions Prisma : erreurs 500 génériques
- **Catégorie** : gestion d'erreurs
- **Fichier** : [main.ts](../backend/src/main.ts) (aucun `useGlobalFilters`, et aucun `ExceptionFilter` dans `src/`)
- **Constat** : les erreurs Prisma de clé étrangère (P2003), d'enregistrement introuvable (P2025), d'unicité (P2002) et de valeur trop longue remontent en « 500 Internal server error ». L'utilisateur voit alors le message « Internal server error » (en anglais) via `messageAffichable`.
- **Correction** : un filtre global qui traduit ces codes en 400, 404 ou 409 avec un message en français.

### 🟡 A13 — Requêtes frontend sans gestion d'erreur
- **Catégorie** : gestion d'erreurs (frontend)
- **Fichiers** : [Compte.jsx:18](../frontend/src/pages/Compte.jsx#L18), [ModifierCagnotte.jsx:29](../frontend/src/pages/ModifierCagnotte.jsx#L29), [DashboardLayout.jsx:13](../frontend/src/components/dashboard/DashboardLayout.jsx#L13), [ListeCagnottes.jsx:66](../frontend/src/pages/ListeCagnottes.jsx#L66), [CreerCagnotte.jsx:71](../frontend/src/pages/CreerCagnotte.jsx#L71)
- **Constat** : ces `.then()` n'ont pas de `.catch()`. Si le serveur ne répond pas, la promesse est rejetée sans être traitée, et rien n'est affiché. Le cas le plus gênant est ModifierCagnotte : le formulaire reste vide, sans message.
- **Correction** : ajouter un `.catch` qui affiche `err.messageAffichable`, comme sur les autres pages.

### 🟡 A14 — Routes backend sans interface
- **Catégorie** : fonctionnalité incomplète
- **Fichiers** : [dons.controller.ts:26-38](../backend/src/dons/dons.controller.ts#L26-L38), `categories.controller.ts` (`POST /categories`)
- **Constat** : `GET /dons` (dons en attente, admin), `POST /dons/:id/valider` (validation manuelle, admin) et `POST /categories` (admin) ne sont appelés nulle part dans le frontend. En pratique, on ne peut créer des catégories qu'en base ou par Swagger.
- **Correction** : ajouter une page d'administration des catégories. Garder ou supprimer la validation manuelle selon le futur fournisseur.

### 🟡 A15 — Informations de l'utilisateur figées dans localStorage
- **Catégorie** : incohérence de données
- **Fichiers** : [AuthContext.jsx:7-13](../frontend/src/context/AuthContext.jsx#L7-L13)
- **Constat** : les rôles, `est_verifie`, le nom et le téléphone sont ceux du moment de la connexion. Aucune route ne permet de les relire (pas de `GET /utilisateurs/moi`). Un rôle admin retiré reste affiché côté interface jusqu'à la déconnexion ; le backend, lui, refuse correctement.
- **Correction** : ajouter `GET /utilisateurs/moi` et l'appeler au chargement de l'application.

### 🟡 A16 — Le lien « conditions d'utilisation » ne mène nulle part
- **Catégorie** : interface / production
- **Fichier** : [AuthPage.jsx:277](../frontend/src/pages/AuthPage.jsx#L277)
- **Constat** : `href="#"`. Aucune page de conditions d'utilisation ni de politique de confidentialité n'existe, alors que l'inscription affirme que l'utilisateur les accepte, sur une plateforme qui manipule de l'argent.
- **Correction** : rédiger ces pages et y faire pointer le lien (par exemple `/conditions`).

### 🟡 A17 — Le type de notification COMMENTAIRE n'est jamais utilisé
- **Catégorie** : fonctionnalité incomplète
- **Fichiers** : `schema.prisma` (enum `TypeNotification`), [notifications.service.ts:13](../backend/src/notifications/notifications.service.ts#L13), [commentaires.service.ts:10-18](../backend/src/commentaires/commentaires.service.ts#L10-L18)
- **Constat** : l'organisateur n'est pas prévenu quand quelqu'un commente sa cagnotte.
- **Correction** : appeler `notificationsService.envoyer(..., 'COMMENTAIRE', idCagnotte)` dans `creer` (sauf si l'auteur est l'organisateur).

### 🟡 A18 — Décalage d'une heure entre la fin des dons et la tâche nocturne
- **Catégorie** : logique métier
- **Fichiers** : [dons.service.ts:27-31](../backend/src/dons/dons.service.ts#L27-L31), [taches.service.ts:9-12](../backend/src/taches/taches.service.ts#L9-L12), [taches.service.ts:38-40](../backend/src/taches/taches.service.ts#L38-L40)
- **Constat** : les dons acceptent jusqu'à la fin du jour `date_fin` **en UTC** (01:00 à Douala). La tâche de 00:05 (heure de Douala) passe pourtant la cagnotte en TERMINEE. Entre 00:05 et 01:00, le message reçu est « n'accepte plus de dons » plutôt que « date de fin dépassée ». L'impact est faible, mais les deux règles ne disent pas la même chose.
- **Correction** : calculer la fin du dernier jour dans le fuseau Africa/Douala dans `dons.service`, avec la même fonction que la tâche.

### 🟡 A19 — Performance du frontend : images lourdes et bundle unique
- **Catégorie** : performance
- **Constat** :
  - aucune image n'a `loading="lazy"` (0 occurrence dans `frontend/src`) ;
  - les photos sont servies telles qu'envoyées, jusqu'à 5 Mo, sans redimensionnement, même pour les miniatures de 72 px ([CarteCagnotteOrganisateur.jsx:16](../frontend/src/components/dashboard/CarteCagnotteOrganisateur.jsx#L16)) ;
  - toutes les pages, admin comprise, sont dans un seul bundle de 422 kB (aucun `lazy()` dans [App.jsx](../frontend/src/App.jsx)).

  Cela pèse sur les connexions mobiles lentes.
- **Correction** : ajouter `loading="lazy"` sur les listes, redimensionner à l'envoi (par exemple avec `sharp`, en 1200 px et en miniature), et charger l'espace admin avec `React.lazy`.

### 🟡 A20 — Le linter frontend (oxlint) plante
- **Catégorie** : production / outillage
- **Constat** : `npm run lint` s'arrête sur « Bus error (core dumped) » (code 135), à chaque exécution. Il reste un dossier temporaire `.binding-linux-x64-gnu-*` dans `node_modules`. Il s'agit probablement d'un binaire natif corrompu à l'installation (non confirmé).
- **Correction** : réinstaller (`rm -rf node_modules && npm ci`) puis relancer le lint.

### 🟡 A21 — Lint backend : 257 erreurs, 28 avertissements
- **Catégorie** : qualité du code
- **Constat** :
  - 195 erreurs de formatage Prettier réparties sur 36 fichiers ;
  - 88 accès `any` non typés (`no-unsafe-*`), surtout `req.user` dans les contrôleurs et le module de paiement ;
  - [main.ts:57](../backend/src/main.ts#L57) : `bootstrap()` n'est pas attendu (`no-floating-promises`) ;
  - [dons.service.ts:185](../backend/src/dons/dons.service.ts#L185) : un `Decimal` est placé dans une chaîne. Le message fonctionne, mais le linter le refuse.
- **Correction** : lancer `npm run format`, typer `req.user` avec une interface commune, et écrire `void bootstrap()` ou ajouter un `.catch`.

### 🟡 A22 — Fichiers parasites dans le dépôt
- **Catégorie** : production / propreté
- **Constat** :
  - `backend/src/payment/` contient `payment.controller.ts.backup`, `payment.service.ts.backup`, `.bak` et `.corrupt` ;
  - à la racine du dépôt, un dossier `src/utilisateurs/` (5 fichiers suivis par git), un `package.json` et un `node_modules/` n'appartiennent à aucun projet ;
  - on y trouve aussi `solifund_corrige.sql` (je n'ai pas vérifié s'il est à jour par rapport à `schema.prisma`) et `.clinerules` ;
  - `README.md` : celui de la racine ne contient qu'une consigne pour l'assistant (« Toujours répondre en français… ») et celui du backend est celui généré par Nest ;
  - `GET /` répond « Hello World! ».
- **Correction** : supprimer les sauvegardes et le `src/` de la racine, rédiger un README (installation, variables, migrations), et retirer `AppController` ou le transformer en route de santé (`/sante`).

### 🟡 A23 — Préparation au déploiement
- **Catégorie** : préparation à la production
- **Constat** :
  - les images sont stockées sur le disque local (`backend/uploads/`). Elles seront perdues à chaque redéploiement sur une plateforme sans disque persistant, et ne sont pas partagées entre plusieurs instances ;
  - aucun Dockerfile ni intégration continue (CI) ;
  - aucune configuration de repli SPA pour react-router en production (dépend de l'hébergeur : non vérifiable ici).

  Points déjà corrects : validation des variables d'environnement au démarrage, helmet, CORS limité à `FRONTEND_URL`, Swagger désactivé en production, throttler.
- **Correction** : stockage objet (S3 ou équivalent) ou volume persistant, un Dockerfile par application, une CI qui lance build, lint et tests.

### 🟡 A24 — Jeton JWT dans localStorage
- **Catégorie** : sécurité
- **Fichiers** : [AuthContext.jsx:12](../frontend/src/context/AuthContext.jsx#L12), [axios.js:20](../frontend/src/api/axios.js#L20)
- **Constat** : le jeton (valable 1 jour) est lisible par tout script de la page. Aucune faille XSS n'a été trouvée (pas de `dangerouslySetInnerHTML`, React échappe les textes), donc le risque est théorique. Il aggrave cependant A3.
- **Correction** : acceptable en l'état ; à terme, cookie `httpOnly` et `SameSite=Strict`.

---

## 2. Ce qui dépend du module de paiement (à reprendre au changement de fournisseur)

- [dons.service.ts](../backend/src/dons/dons.service.ts) :
  - `creer` appelle `paymentService.initierPaiement(numero, montant, libellé, référence, méthode)` et lit `resultat.payToken` et `resultat.status` ;
  - `verifierStatutDon` appelle `paymentService.verifierStatut(transaction_id)` ;
  - les statuts propres à AangaraaPay (`SUCCESSFUL`, `FAILED`, `CANCELLED`, `EXPIRED`) sont écrits en dur dans `verifierStatutDon` et `gererWebhookPaiement`.
- [payment.controller.ts](../backend/src/payment/payment.controller.ts) appelle `DonsService.gererWebhookPaiement` : c'est une dépendance croisée entre les modules payment et dons (voir A1).
- `Paiement.transaction_id` et `reference_externe` (Prisma) stockent les identifiants du fournisseur.
- `DonsModule` importe `PaymentModule`, et `app.module.ts` enregistre `PaymentModule`.
- Frontend : [FormulaireDon.jsx](../frontend/src/components/cagnotte/FormulaireDon.jsx) appelle `POST /dons` puis `POST /dons/:id/verifier-statut`. Il est indépendant du fournisseur, tant que ces deux routes gardent leur contrat.
- Les retraits (`retraits.service.ts`) n'appellent pas le fournisseur : le versement se fait hors plateforme, et l'admin marque le retrait TRAITE.

---

## 3. Vérifications sans problème relevé

- Toutes les routes appelées par le frontend existent dans le backend.
- Aucun `TODO` ni `FIXME` dans le code.
- Retraits : verrou `FOR UPDATE`, prise en compte des retraits EN_ATTENTE, et transitions conditionnelles dans `traiter` et `rejeter`.
- Validation des dons protégée contre la double validation (`appliquerValidation`).
- Comptes bannis ou suspendus refusés à la connexion et à chaque requête (`JwtStrategy`).
- Réinitialisation du mot de passe : code haché, nombre d'essais limité, throttler.
- Envoi d'images : type vérifié par les premiers octets du fichier, nom UUID, `nosniff`.
- Index Prisma présents sur toutes les clés étrangères et les colonnes filtrées.
- Mesures déjà faites à 375 px : aucun débordement horizontal, aucune image sans `alt`, aucun champ sans libellé.

---

## 4. Récapitulatif

| Gravité | Nombre | Points |
|---|---|---|
| 🔴 bloquant | 1 | A1 |
| 🟠 important | 8 | A2 à A9 |
| 🟡 mineur | 15 | A10 à A24 |
| **Total** | **24** | |

Par catégorie :
- sécurité : 4 (A1, A3, A5, A24) ;
- incohérence de données : 4 (A2, A7, A8, A15) ;
- logique métier : 4 (A6, A10, A11, A18) ;
- fonctionnalités incomplètes, dont Google : 4 (A4, A14, A16, A17) ;
- gestion d'erreurs : 2 (A12, A13) ;
- préparation à la production et outillage : 5 (A9, A20, A21, A22, A23) ;
- performance : 1 (A19).

Ordre de traitement conseillé : A1 (avec le nouveau fournisseur), puis A2, A3 et A5, qui sont courts à corriger, puis A4 (décider : retirer ou implémenter Google).
