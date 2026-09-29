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


## Frontend : charte graphique SoliFund
- Toujours lire frontend/DESIGN.md avant de toucher un fichier .jsx, et suivre la charte à la lettre.
- Ne jamais inventer de style : réutiliser les composants existants (Button, Logo…) et les classes
  décrites dans DESIGN.md.
- Interdit : couleurs hors de la charte, dégradés, emojis, effets de verre, nouvelles bibliothèques
  d'interface, phrases génériques du type « Oups ! ».
- Tous les textes du site vouvoient l'utilisateur.
- Avant de modifier un fichier .jsx, annoncer la liste courte des changements visuels prévus.