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
- La production (o2switch) est en PostgreSQL 9.6 : toute migration doit y fonctionner. En particulier,
  un ajout de valeur à un enum (`ALTER TYPE ... ADD VALUE`) va dans une migration à part, qui ne
  contient que cette seule instruction (avant PostgreSQL 12, elle échoue avec d'autres commandes), et
  la nouvelle valeur ne peut être utilisée que dans une migration suivante. Pas de fonctions ni de
  syntaxes postérieures à 9.6 (gen_random_uuid() natif, colonnes générées, procédures, INCLUDE,
  NULLS NOT DISTINCT, fonctions jsonpath...). L'historique des migrations a été regroupé dans
  `00000000000000_initialisation`.

## En attente
Paiement : deux fournisseurs, Notch Pay et AangaraaPay, derrière l'interface FournisseurPaiement
(backend/src/payment/, modifiable). Le reste du code (dons, retraits, webhooks, réconciliation) ne
passe que par FournisseursPaiement ; le fournisseur actif est choisi par PAIEMENT_FOURNISSEUR.
AangaraaPay : client écrit d'après la documentation (docs/paiement/aangaraa-api.md), jamais essayé
en réel ; ses webhooks ne sont pas signés (le statut est toujours reconsulté). Notch Pay : lecture
des paiements calée sur de vraies réponses (docs/paiement/exemples/), corps du versement encore à
confirmer en mode test.


## Frontend : charte graphique SoliFund
- Toujours lire frontend/DESIGN.md avant de toucher un fichier .jsx, et suivre la charte à la lettre.
- Ne jamais inventer de style : réutiliser les composants existants (Button, Logo…) et les classes
  décrites dans DESIGN.md.
- Interdit : couleurs hors de la charte, dégradés, emojis, effets de verre, nouvelles bibliothèques
  d'interface, phrases génériques du type « Oups ! ».
- Tous les textes du site vouvoient l'utilisateur.
- Avant de modifier un fichier .jsx, annoncer la liste courte des changements visuels prévus.