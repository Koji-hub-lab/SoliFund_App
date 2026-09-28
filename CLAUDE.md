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
