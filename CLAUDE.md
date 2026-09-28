# SoliFund
Plateforme de cagnottes solidaires au Cameroun (dons via Mobile Money MTN/Orange, devise XAF).
- backend/ : NestJS 11 + Prisma 7 + PostgreSQL. Auth JWT (passport-jwt), rôles ROLE_USER / ROLE_ADMIN.
- frontend/ : React 19 + Vite + Tailwind 4 + react-router 7. Client HTTP dans src/api/axios.js.

## Règles
- Toujours répondre en français.
- Avant chaque modification importante, expliquer en une phrase ce que tu vas faire et pourquoi.
- Faire une seule tâche à la fois, sans modifier de fichiers hors du périmètre demandé.
- Ne jamais lire ni afficher le contenu de backend/.env.
- Après chaque modification du backend, vérifier que `npm run build` passe dans backend/.

## En attente
Le fournisseur de paiement (AangaraaPay) va être remplacé : ne pas modifier backend/src/payment/ sauf demande explicite.


## Frontend : préserver le design existant
Le design du frontend a été fait à la main et ne doit pas ressembler à une interface générée par IA.
- Toujours lire frontend/DESIGN.md avant de toucher un fichier .jsx.
- Ne jamais modifier les classes Tailwind, la mise en page ou les textes existants sauf si la tâche
  le demande explicitement.
- Pour tout nouvel élément visuel, copier le style d'un élément existant équivalent (citer lequel)
  et réutiliser les composants existants (Button, etc.) plutôt qu'en créer.
- Interdit : nouvelles couleurs hors du thème, dégradés, ombres portées marquées, emojis,
  animations décoratives, nouvelles bibliothèques d'interface (shadcn, toasts, modales…),
  phrases génériques du type « Oups ! Quelque chose s'est mal passé ».
- Textes en français, au tutoiement, courts et concrets, dans le ton des textes existants.
- Avant de modifier un fichier .jsx, annoncer en une liste courte les changements VISUELS prévus.
  S'il n'y en a aucun, le dire.
