# SoliFund

Plateforme de cagnottes solidaires pour le Cameroun : un organisateur crée une cagnotte pour un projet
(santé, études, mariage, association...), les donateurs y contribuent par **MTN Mobile Money** ou
**Orange Money** (en XAF), puis l'organisateur demande le retrait des fonds, vérifié par l'équipe.

| Dossier | Contenu |
|---|---|
| `backend/` | API NestJS 11 + Prisma 7 + PostgreSQL (authentification JWT, rôles `ROLE_USER` / `ROLE_ADMIN`) |
| `frontend/` | Site React 19 + Vite + Tailwind 4 (charte graphique : `frontend/DESIGN.md`) |
| `docs/` | Audit (`AUDIT.md`) et ancien schéma SQL conservé pour mémoire |

> Paiements Mobile Money : prestataire 3SPAY (client dans `backend/src/paiement-3spay/`,
> spécification dans `docs/paiement/3spay-openapi.json`). Les dons y seront branchés prochainement.

## Prérequis

- Node.js 22 ou plus récent (développé avec Node.js 26)
- PostgreSQL (une base pour le développement ; la base des tests est créée automatiquement, voir « Tests »)
- Un compte [Brevo](https://www.brevo.com/) pour l'envoi des emails (codes de vérification et de réinitialisation)

## Installation

```bash
# Backend
cd backend
npm ci
cp .env.example .env        # puis renseigner les valeurs (voir ci-dessous)
npx prisma migrate deploy   # crée les tables
npx prisma db seed          # crée les rôles ROLE_USER et ROLE_ADMIN

# Frontend
cd ../frontend
npm ci
cp .env.example .env        # facultatif en développement
```

Pour donner le rôle administrateur à un compte existant :

```bash
cd backend
npx tsx prisma/promouvoir-admin.ts email@exemple.com
```

## Variables d'environnement

### Backend (`backend/.env`, modèle dans `backend/.env.example`)

L'API vérifie ces variables au démarrage et refuse de démarrer si une variable obligatoire manque.

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Connexion PostgreSQL |
| `JWT_SECRET` | oui | Secret de signature des jetons (32 caractères minimum) |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | oui | Envoi des emails |
| `FRONTEND_URL` | oui | Adresse du site : origine autorisée (CORS) et redirection des liens de partage |
| `PUBLIC_API_URL` | non | Adresse publique de l'API, pour les liens de partage et les aperçus WhatsApp / Facebook (par défaut `http://localhost:<PORT>`) |
| `BREVO_SENDER_NOM` | non | Nom de l'expéditeur des emails |
| `PORT` | non | Port HTTP (3000 par défaut) |
| `NODE_ENV` | non | `development`, `production` ou `test` ; en production, la documentation `/docs` est désactivée |
| `TROISPAY_API_URL`, `TROISPAY_API_KEY`, `TROISPAY_PARTNER_ID`, `TROISPAY_WEBHOOK_SECRET` | oui | Prestataire de paiement 3SPAY : adresse de l'API (HTTPS), identifiants partenaire et secret de signature des webhooks |
| `TROISPAY_OPERATEUR_MTN`, `TROISPAY_OPERATEUR_ORANGE` | non | Code opérateur 3SPAY utilisé pour MTN et Orange (par défaut `mtn` et `intouch`) |
| `DATABASE_URL_TEST` | non | Base des tests e2e (par défaut : la base de `DATABASE_URL` suffixée par `_test`) |

### Frontend (`frontend/.env`, modèle dans `frontend/.env.example`)

| Variable | Rôle |
|---|---|
| `VITE_API_URL` | Adresse de l'API. **Vide en développement** : les appels passent par le proxy Vite (`/api`), ce qui permet aussi de tester depuis un téléphone du réseau local. À renseigner pour la production. |
| `VITE_SITE_URL` | Adresse publique du site, pour l'image d'aperçu de l'accueil (balises Open Graph). À renseigner pour la production. |

## Base de données et migrations

`backend/prisma/schema.prisma` est la seule référence du schéma (`docs/solifund_corrige.sql` n'est plus à jour).

```bash
cd backend
npx prisma migrate deploy                    # applique les migrations en attente
npx prisma migrate dev --name <nom>          # développement : crée une migration après une modification du schéma
npx prisma generate                          # régénère le client Prisma
```

Les photos de cagnotte sont stockées en WebP (1200 px et miniature de 400 px) dans `backend/uploads/`.
Pour convertir des images envoyées avant ce format : `npx tsx scripts/convertir-images.ts` (option `--essai`
pour voir ce qui serait fait sans rien modifier).

## Lancement

```bash
# Développement (deux terminaux)
cd backend && npm run start:dev     # API sur http://localhost:3000, documentation sur /docs
cd frontend && npm run dev          # site sur http://localhost:5173 (et http://<ip-du-pc>:5173)

# Production
cd backend && npm run build && npm run start:prod
cd frontend && npm run build        # fichiers statiques dans frontend/dist
```

- `npm run build` dans `backend/` vide le dossier `dist/` : relancez ensuite `npm run start:dev` s'il tournait.
- Le site est une application monopage : en production, l'hébergeur doit renvoyer `index.html` pour toute
  adresse inconnue (`/cagnottes/12`, `/login`...).
- `GET /sante` répond `{ "statut": "ok" }` : à utiliser pour la supervision.

## Tests et qualité

```bash
cd backend
npm run test        # tests unitaires
npm run test:e2e    # tests de bout en bout sur une base de test séparée
npm run lint        # ESLint (corrige ce qui peut l'être automatiquement)
npm run format      # Prettier

cd ../frontend
npm run lint        # oxlint
```

Les tests e2e créent la base de test si elle n'existe pas (`DATABASE_URL_TEST`, ou `<base>_test` sur le même
serveur), y appliquent les migrations, puis vident ses tables avant chaque fichier de test. Ils refusent de
s'exécuter sur une base dont le nom ne contient pas « test » : la base de développement n'est jamais touchée.
Ils couvrent les retraits (solde, retraits en attente, demandes simultanées, double traitement), la validation
des dons, la visibilité des cagnottes et de leurs listes, la connexion (compte banni, jeton antérieur à un
changement de mot de passe) et la gestion des catégories.


## Pages utiles

- Conditions d'utilisation : `/conditions` ; politique de confidentialité : `/confidentialite`
  (textes de base, **à faire relire par un juriste**)
- Administration (compte `ROLE_ADMIN`) : `/admin/tableau-de-bord`
- Lien de partage d'une cagnotte, avec aperçu WhatsApp / Facebook : `<PUBLIC_API_URL>/partage/cagnottes/<id>`
