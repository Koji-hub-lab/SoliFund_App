# SoliFund

Plateforme de cagnottes solidaires pour le Cameroun : un organisateur crée une cagnotte pour un projet
(santé, études, mariage, association...), les donateurs y contribuent par **MTN Mobile Money** ou
**Orange Money** (en XAF), puis l'organisateur demande le retrait des fonds, vérifié par l'équipe.

| Dossier | Contenu |
|---|---|
| `backend/` | API NestJS 11 + Prisma 7 + PostgreSQL (authentification JWT, rôles `ROLE_USER` / `ROLE_ADMIN`) |
| `frontend/` | Site React 19 + Vite + Tailwind 4 (charte graphique : `frontend/DESIGN.md`) |
| `docs/` | Audit (`AUDIT.md`), déploiement sur o2switch (`DEPLOIEMENT-O2SWITCH.md`) et documentation des fournisseurs de paiement (`paiement/`) |

> Paiements Mobile Money : deux fournisseurs, Notch Pay et AangaraaPay, derrière une interface
> commune (`backend/src/payment/`, documentation dans `docs/paiement/`). Le fournisseur des nouveaux
> paiements et versements est choisi par `PAIEMENT_FOURNISSEUR`. Un don est créé « en attente »,
> payé sur le téléphone du donateur, puis validé quand le fournisseur confirme le paiement
> (vérification par la page, webhook, et réconciliation automatique toutes les 5 minutes). Un
> retrait approuvé par un administrateur est versé sur le numéro vérifié de l'organisateur ; un mode
> manuel (« versement effectué hors plateforme ») reste disponible en secours.

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
| `JWT_DUREE` | non | Durée d'une connexion : secondes (`3600`) ou `30m`, `12h`, `1d`... (`1d` par défaut) |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | oui | Envoi des emails |
| `FRONTEND_URL` | oui | Adresse du site : origine autorisée (CORS) et redirection des liens de partage |
| `PUBLIC_API_URL` | en production, ou si `aangaraa` | Adresse publique de l'API : liens de partage, aperçus WhatsApp / Facebook et webhook AangaraaPay. En développement, sans elle, l'adresse de la requête reçue sert |
| `TRUST_PROXY` | non | Nombre de proxys de confiance devant l'API (0 par défaut). Derrière un hébergeur ou un Nginx, mettre 1 : la vraie adresse du visiteur est alors lue dans `X-Forwarded-For` pour les limites par adresse IP. Laisser 0 si l'API est exposée directement (l'en-tête serait sinon falsifiable) |
| `COMMISSION_TAUX_POURCENT` | non | Commission SoliFund sur les retraits, en % (3 par défaut). Le taux est figé dans chaque retrait à la demande |
| `FRAIS_MTN_ENCAISSEMENT_POURCENT`, `FRAIS_MTN_VERSEMENT_POURCENT`, `FRAIS_ORANGE_ENCAISSEMENT_POURCENT`, `FRAIS_ORANGE_VERSEMENT_POURCENT` | non | Frais de transaction payés par le donateur en plus de son don, en % (tarifs d'AangaraaPay par défaut : 1,7 / 1,3 / 1,5 / 2,1). Frais = don × (encaissement de l'opérateur du donateur + versement de l'opérateur de retrait vérifié de l'organisateur, ou le plus élevé s'il n'est pas connu), arrondis au supérieur ; seul le don va à la cagnotte |
| `DON_MONTANT_MINIMUM` | non | Montant minimum d'un don, en XAF (100 par défaut) ; s'applique au don, pas au total avec les frais |
| `SEUIL_OBJECTIF_VERIFICATION`, `SEUIL_SIGNALEMENTS` | non | Modération : objectif (XAF) au-dessus duquel une cagnotte est vérifiée avant publication (1 000 000 par défaut), et nombre de signalements qui suspend une cagnotte (3 par défaut) |
| `STOCKAGE_PRIVE_DIR` | non | Dossier des pièces d'identité des organisateurs (par défaut `backend/stockage-prive`, jamais servi publiquement) ; en production, un volume persistant et sauvegardé |
| `UPLOADS_DIR` | non | Dossier des photos des cagnottes, servies sous `/uploads` (par défaut `backend/uploads`) ; en production, un volume persistant |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | non | Connexion avec Google : les trois ensemble, ou aucune. L'URL de retour (`<site>/api/auth/google/callback` en développement) doit être déclarée dans la Google Cloud Console |
| `BREVO_SENDER_NOM` | non | Nom de l'expéditeur des emails |
| `PORT` | non | Port HTTP (3000 par défaut) ; sur un hébergement Passenger, fourni par Passenger (numéro ou socket) |
| `TACHES_INTERNES` | non | `true` : l'application lance elle-même les tâches planifiées (développement). Sinon (production), elles sont lancées par Cron : `node dist/scripts/taches.js <tâche>` (`reconciliation`, `alertes`, `maintenance`, `purge-identites`) |
| `NODE_ENV` | non | `development`, `production` ou `test` ; en production, la documentation `/docs` est désactivée |
| `PAIEMENT_FOURNISSEUR` | non | Fournisseur des nouveaux paiements et versements : `notchpay` (par défaut) ou `aangaraa` |
| `AANGARAA_APP_KEY`, `AANGARAA_WEBHOOK_JETON` | si `aangaraa` | Clé du service AangaraaPay et jeton secret du webhook (32 caractères au moins), jamais écrits dans les logs ; `AANGARAA_API_URL` facultative. Le webhook `POST /paiements/webhook/aangaraa/<jeton>` est construit avec `PUBLIC_API_URL`, alors obligatoire et joignable depuis Internet |
| `NOTCHPAY_PUBLIC_KEY`, `NOTCHPAY_PRIVATE_KEY` | si `notchpay` | Clés Notch Pay (clé publique : toutes les requêtes ; clé privée : versements et solde). Hors production, l'API **refuse de démarrer** avec une clé « live » (argent réel) ; en production, un avertissement est écrit si une clé de test est utilisée |
| `NOTCHPAY_AUTORISER_LIVE_EN_DEV` | non | `true` pour accepter quand même une clé « live » hors production |
| `NOTCHPAY_FORMAT_TELEPHONE` | non | Format des numéros envoyés à Notch Pay : `sans_plus` (`237677123456`, par défaut) ou `avec_plus` (`+237677123456`) |
| `NOTCHPAY_WEBHOOK_HASH` | en production | Hash de signature des webhooks Notch Pay (`POST /paiements/webhook/notchpay`) ; sans lui, tous les webhooks sont refusés (403) |
| `NOTCHPAY_API_URL` | non | URL de l'API Notch Pay (par défaut `https://api.notchpay.co`) |
| `DATABASE_URL_TEST` | non | Base des tests e2e (par défaut : la base de `DATABASE_URL` suffixée par `_test`) |

### Frontend (`frontend/.env`, modèle dans `frontend/.env.example`)

| Variable | Rôle |
|---|---|
| `VITE_API_URL` | Adresse de l'API. **Vide en développement** : les appels passent par le proxy Vite (`/api`), ce qui permet aussi de tester depuis un téléphone du réseau local. À renseigner pour la production. |
| `VITE_SITE_URL` | Adresse publique du site, pour l'image d'aperçu de l'accueil (balises Open Graph). À renseigner pour la production. |

## Base de données et migrations

`backend/prisma/schema.prisma` est la seule référence du schéma.

```bash
cd backend
npx prisma migrate deploy                    # applique les migrations en attente
npx prisma migrate dev --name <nom>          # développement : crée une migration après une modification du schéma
npx prisma generate                          # régénère le client Prisma
```

Les photos de cagnotte sont stockées en WebP (1200 px et miniature de 400 px) dans `backend/uploads/`
(ou `UPLOADS_DIR`).
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
npm run typecheck   # vérification TypeScript de tout le code, tests compris (0 erreur attendue)
npm run test        # vérification TypeScript, puis tests unitaires
npm run test:e2e    # vérification TypeScript, puis tests de bout en bout sur une base de test séparée
npm run lint        # ESLint (corrige ce qui peut l'être automatiquement)
npm run format      # Prettier

cd ../frontend
npm run lint        # oxlint
```

Les tests e2e créent la base de test si elle n'existe pas (`DATABASE_URL_TEST`, ou `<base>_test` sur le même
serveur), y appliquent les migrations, puis vident ses tables avant chaque fichier de test. Ils refusent de
s'exécuter sur une base dont le nom ne contient pas « test » : la base de développement n'est jamais touchée.
Ils couvrent notamment les dons et les retraits avec les deux fournisseurs de paiement (faux clients, aucun
appel réel), les webhooks, les frais de transaction et la commission, la vérification d'identité, la modération,
la visibilité des cagnottes, la connexion (compte banni, jeton antérieur à un changement de mot de passe,
Google), les limites par adresse IP derrière un proxy et la traduction des messages.

## Mise en production

Guide pas à pas pour o2switch (cPanel, Passenger, Cron) : [docs/DEPLOIEMENT-O2SWITCH.md](docs/DEPLOIEMENT-O2SWITCH.md).

- `NODE_ENV=production`, `PUBLIC_API_URL` (obligatoire), `FRONTEND_URL`, et côté frontend `VITE_API_URL` et
  `VITE_SITE_URL`.
- `TRUST_PROXY=1` si l'API est derrière un hébergeur ou un proxy (cas habituel).
- `TACHES_INTERNES=false` et les tâches Cron, si l'hébergeur peut mettre l'application en veille.
- `npm run deploiement` dans `backend/` : `prisma generate`, `prisma migrate deploy`, puis build.
- `UPLOADS_DIR` et `STOCKAGE_PRIVE_DIR` sur des volumes persistants (photos et pièces d'identité), sauvegardés.
- Clés « live » du fournisseur de paiement, et `NOTCHPAY_WEBHOOK_HASH` avec Notch Pay.
- Compléter les passages entre crochets des pages `/conditions` et `/confidentialite`
  (`frontend/src/locales/*/legal.json`).


## Pages utiles

- Conditions d'utilisation : `/conditions` ; politique de confidentialité : `/confidentialite`
  (textes de base, **à faire relire par un juriste**)
- Administration (compte `ROLE_ADMIN`) : `/admin/tableau-de-bord`
- Lien de partage d'une cagnotte, avec aperçu WhatsApp / Facebook : `<PUBLIC_API_URL>/partage/cagnottes/<id>`
