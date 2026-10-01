# Déploiement de SoliFund sur o2switch (cPanel)

Organisation retenue :

| Élément | Adresse | Hébergement |
|---|---|---|
| Site (frontend React, fichiers statiques) | `https://solifund.<domaine>` | dossier du sous-domaine, servi par Apache (`.htaccess`) |
| API (backend NestJS) | `https://api.solifund.<domaine>` | « Setup Node.js App » (Phusion Passenger), Node.js 24 |
| Base de données | — | PostgreSQL de cPanel |
| Tâches planifiées | — | « Tâches Cron » de cPanel (`node dist/scripts/taches.js <tâche>`) |

Dans ce document, `UTILISATEUR` est l'identifiant cPanel et `<domaine>` le domaine (ex. `exemple.cm`).
Toutes les valeurs données sont **factices**.

Plan des dossiers sur le serveur (tout ce qui est privé reste **hors de `public_html`**) :

```
/home/UTILISATEUR/
├── solifund/                  # dépôt git (ou copie) : backend/ et frontend/
│   └── backend/               # racine de l'application Node.js (app.js, .env, dist/)
├── solifund-donnees/
│   ├── uploads/               # photos des cagnottes (UPLOADS_DIR), servies par l'API sous /uploads
│   └── stockage-prive/        # pièces d'identité (STOCKAGE_PRIVE_DIR), jamais servies
├── solifund.<domaine>/        # racine web du site : contenu de frontend/dist/
├── logs/solifund-taches.log   # sortie des tâches Cron
└── tmp/                       # verrous des tâches Cron (flock)
```

## 1. Prérequis

### PostgreSQL

Prisma 7 prend en charge **PostgreSQL 9.6 et plus récent** : sa liste des versions supportées commence
à la 9.6, et le passage à Prisma 7 ne change pas ce minimum. Les migrations de SoliFund n'utilisent rien
de plus récent. Vérifié sur un conteneur `postgres:9.6.24` : `prisma migrate deploy` sur une base vide,
puis les 171 tests e2e, tous réussis. Les versions 9.6 à 12 ne reçoivent toutefois plus de correctifs
de sécurité : **13 ou plus est recommandé**. Vérifier la version fournie par o2switch :

```bash
psql --version                 # en SSH
# ou, dans phpPgAdmin : SELECT version();
```

### Base, sous-domaines, SSH

1. cPanel → **Bases de données PostgreSQL** : créer la base `UTILISATEUR_solifund` et l'utilisateur
   `UTILISATEUR_solifund`, puis donner à l'utilisateur tous les privilèges sur la base.
2. cPanel → **Domaines** : créer `solifund.<domaine>` (racine `solifund.<domaine>`) et
   `api.solifund.<domaine>`. Le certificat SSL (AutoSSL / Let's Encrypt) doit couvrir les deux.
3. cPanel → **Accès SSH** : activer l'accès (clé SSH) ; toutes les commandes ci-dessous se lancent en SSH.
4. Créer les dossiers privés :

```bash
mkdir -p ~/solifund-donnees/uploads ~/solifund-donnees/stockage-prive ~/logs ~/tmp
chmod 700 ~/solifund-donnees/stockage-prive
```

## 2. Variables d'environnement de production

Elles sont écrites dans **`~/solifund/backend/.env`** (modèle complet : `backend/.env.example`). Le
fichier est lu à la fois par l'application lancée par Passenger et par les tâches Cron. Les variables
saisies dans l'interface « Setup Node.js App » ne sont **pas** vues par Cron : ne pas les utiliser, ou
les doubler dans le fichier.

```bash
chmod 600 ~/solifund/backend/.env
```

L'API vérifie ces variables au démarrage et **refuse de démarrer** si l'une d'elles est invalide ou si une
variable obligatoire manque. Le message d'erreur se lit dans le journal de Passenger (voir § 6).

### Obligatoires

| Variable | Exemple (factice) | Rôle |
|---|---|---|
| `NODE_ENV` | `production` | Mode production : documentation `/docs` désactivée, `PUBLIC_API_URL` exigée |
| `DATABASE_URL` | `postgresql://UTILISATEUR_solifund:Mot2PasseFort@localhost:5432/UTILISATEUR_solifund?schema=public` | Base PostgreSQL de cPanel |
| `JWT_SECRET` | `Zq3v9KpL0aXf7Rm2Tn8Wc4Yb6Hd1Ue5Gs0Jk3Lp9Qx` | Secret des jetons de connexion, 32 caractères aléatoires au moins (`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`) |
| `BREVO_API_KEY` | `xkeysib-0123456789abcdef-FAUSSECLE` | Envoi des emails (Brevo) |
| `BREVO_SENDER_EMAIL` | `no-reply@<domaine>` | Expéditeur des emails (adresse validée dans Brevo) |
| `FRONTEND_URL` | `https://solifund.<domaine>` | Adresse du site : CORS et redirections |
| `PUBLIC_API_URL` | `https://api.solifund.<domaine>` | Adresse publique de l'API : liens de partage, aperçus WhatsApp / Facebook, webhook AangaraaPay |
| `PAIEMENT_FOURNISSEUR` | `aangaraa` | Fournisseur des paiements et versements : `aangaraa` ou `notchpay` |

### Hébergement (o2switch)

| Variable | Exemple (factice) | Rôle |
|---|---|---|
| `TACHES_INTERNES` | `false` | Les tâches planifiées sont lancées par Cron (§ 5), pas par l'application, que Passenger peut mettre en veille |
| `TRUST_PROXY` | `1` | Apache et Passenger relaient les requêtes : la vraie adresse du visiteur est lue dans `X-Forwarded-For` (limites par adresse IP). À confirmer après la mise en ligne (§ 6) |
| `UPLOADS_DIR` | `/home/UTILISATEUR/solifund-donnees/uploads` | Photos des cagnottes, hors de `public_html` |
| `STOCKAGE_PRIVE_DIR` | `/home/UTILISATEUR/solifund-donnees/stockage-prive` | Pièces d'identité, hors de `public_html`, jamais servies |
| `PORT` | *(ne pas définir)* | Fourni par Passenger (numéro ou socket) |

### Paiement

| Variable | Exemple (factice) | Rôle |
|---|---|---|
| `AANGARAA_APP_KEY` | `aangaraa-cle-service-FAUSSE-0123` | Clé du service AangaraaPay (si `aangaraa`) |
| `AANGARAA_WEBHOOK_JETON` | `9f2c1e7a4b8d0f3a6c5e2b1d7f4a9c3e0b6d8f1a2c4e7b9d` | Jeton secret de l'adresse du webhook, 32 caractères au moins (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) |
| `AANGARAA_API_URL` | `https://api-production.aangaraa-pay.com` | Facultative (valeur par défaut) |
| `NOTCHPAY_PUBLIC_KEY` | `pk.FAUSSE_CLE_PUBLIQUE` | Si `notchpay` |
| `NOTCHPAY_PRIVATE_KEY` | `sk.FAUSSE_CLE_PRIVEE` | Si `notchpay` (versements, solde) |
| `NOTCHPAY_WEBHOOK_HASH` | `hsk.FAUX_HASH_WEBHOOK` | Si `notchpay` : signature des webhooks, obligatoire en production |
| `NOTCHPAY_FORMAT_TELEPHONE` | `sans_plus` | Facultative : `sans_plus` ou `avec_plus` |
| `NOTCHPAY_API_URL` | `https://api.notchpay.co` | Facultative (valeur par défaut) |
| `NOTCHPAY_AUTORISER_LIVE_EN_DEV` | *(ne pas définir)* | Sert seulement hors production ; en production, les clés « live » sont acceptées |
| `FRAIS_MTN_ENCAISSEMENT_POURCENT` | `1.7` | Frais payés par le donateur (tarifs d'AangaraaPay par défaut) |
| `FRAIS_MTN_VERSEMENT_POURCENT` | `1.3` | |
| `FRAIS_ORANGE_ENCAISSEMENT_POURCENT` | `1.5` | |
| `FRAIS_ORANGE_VERSEMENT_POURCENT` | `2.1` | |

Adresse du webhook à communiquer :
- AangaraaPay : construite automatiquement (`https://api.solifund.<domaine>/paiements/webhook/aangaraa/<AANGARAA_WEBHOOK_JETON>`) ;
- Notch Pay : `https://api.solifund.<domaine>/paiements/webhook/notchpay`, à déclarer dans son tableau de bord.

### Réglages facultatifs

| Variable | Exemple | Rôle |
|---|---|---|
| `BREVO_SENDER_NOM` | `SoliFund` | Nom de l'expéditeur |
| `JWT_DUREE` | `1d` | Durée d'une connexion (`3600`, `30m`, `12h`, `1d`) |
| `COMMISSION_TAUX_POURCENT` | `3` | Commission sur les retraits |
| `DON_MONTANT_MINIMUM` | `100` | Don minimum en XAF |
| `SEUIL_OBJECTIF_VERIFICATION` | `1000000` | Objectif (XAF) au-delà duquel une cagnotte est vérifiée avant publication |
| `SEUIL_SIGNALEMENTS` | `3` | Signalements qui suspendent une cagnotte |
| `GOOGLE_CLIENT_ID` | `000000000000-exemple.apps.googleusercontent.com` | Connexion avec Google : les trois ensemble, ou aucune |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-FAUX-SECRET` | |
| `GOOGLE_CALLBACK_URL` | `https://api.solifund.<domaine>/auth/google/callback` | À déclarer à l'identique dans la Google Cloud Console |

### Frontend (au moment du build)

Fichier `frontend/.env.production`, lu par `npm run build` :

| Variable | Exemple (factice) | Rôle |
|---|---|---|
| `VITE_API_URL` | `https://api.solifund.<domaine>` | Adresse de l'API appelée par le site (le build affiche un avertissement si elle est vide) |
| `VITE_SITE_URL` | `https://solifund.<domaine>` | Adresse du site, pour l'aperçu des liens de l'accueil |

## 3. Premier déploiement

### Backend

1. Copier le projet dans `~/solifund` (`git clone` ou envoi par SFTP), puis créer `~/solifund/backend/.env`
   (§ 2).
2. cPanel → **Setup Node.js App** → *Create Application* :
   - Node.js version : **24** ; Application mode : **Production** ;
   - Application root : `solifund/backend` ;
   - Application URL : `api.solifund.<domaine>` ;
   - Application startup file : **`app.js`**.

   Ne pas ajouter de variables dans cette page (voir § 2). En haut de la page, cPanel affiche la
   commande qui active l'environnement Node.js de l'application, du type :
   `source /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/activate && cd /home/UTILISATEUR/solifund/backend`.
3. En SSH, installer et construire :

```bash
source /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/activate && cd ~/solifund/backend
npm install --include=dev      # les outils de build (nest, prisma) sont des dépendances de développement
npm run deploiement            # prisma generate + prisma migrate deploy + nest build
node -r dotenv/config dist/prisma/seed.js                                # rôles ROLE_USER et ROLE_ADMIN
node -r dotenv/config dist/prisma/promouvoir-admin.js admin@<domaine>    # après l'inscription du premier admin
touch tmp/restart.txt          # (re)démarre l'application dans Passenger
```

> L'environnement Node.js de cPanel relie `node_modules` à son propre dossier : utiliser `npm install`,
> pas `npm ci` (qui supprime `node_modules`), et ne pas supprimer ce dossier à la main.

4. Vérifier : `https://api.solifund.<domaine>/sante` doit répondre `{"statut":"ok"}`.

### Frontend

Le site est construit sur le poste de développement, puis envoyé :

```bash
cd frontend
cp .env.example .env.production   # puis renseigner VITE_API_URL et VITE_SITE_URL
npm ci && npm run build           # dist/ contient aussi .htaccess (routage, cache, HTTPS)
rsync -av --delete dist/ UTILISATEUR@<serveur-o2switch>:solifund.<domaine>/
```

Le fichier `.htaccess` (copié depuis `frontend/public/`) :
- force le HTTPS ;
- renvoie toute adresse inconnue (`/cagnottes/12`, `/login`...) vers `index.html` ;
- garde un an les fichiers de `assets/`, dont le nom change à chaque build ;
- fait toujours revalider `index.html`.

## 4. Mise à jour

```bash
# Backend (SSH)
source /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/activate && cd ~/solifund/backend
git pull                       # ou envoi des fichiers modifiés
npm install --include=dev
npm run deploiement            # applique les nouvelles migrations, puis reconstruit dist/
touch tmp/restart.txt

# Frontend (poste de développement)
cd frontend && npm run build && rsync -av --delete dist/ UTILISATEUR@<serveur-o2switch>:solifund.<domaine>/
```

Pendant `npm run deploiement`, `dist/` est vidé puis reconstruit : l'API est indisponible quelques
secondes, jusqu'au redémarrage. Les tâches Cron qui tombent pendant ce temps échouent et seront
relancées au passage suivant.

## 5. Tâches Cron

Passenger peut mettre l'application en veille quand elle ne reçoit pas de requêtes : les tâches
planifiées ne doivent donc pas tourner dans l'application (`TACHES_INTERNES=false`). Chaque tâche est
lancée par Cron avec `node dist/scripts/taches.js <tâche>`. Le script démarre l'application sans serveur
web, exécute la tâche puis s'arrête. Code de sortie : 0 succès, 1 échec, 2 tâche inconnue.

| Tâche | Fréquence | Rôle |
|---|---|---|
| `reconciliation` | toutes les 5 minutes | Relit chez le fournisseur les dons en attente (plus de 2 minutes) et les versements lancés (plus de 5 minutes), applique le statut final, abandonne les dons trop anciens |
| `alertes` | toutes les 5 minutes | Envoie par email les alertes des administrateurs en attente : un email au plus toutes les 10 minutes, la première alerte partant tout de suite |
| `maintenance` | toutes les heures | Passe en TERMINEE les cagnottes dont la date de fin est passée (minuit, heure de Douala), lève les suspensions arrivées à échéance, supprime les alertes envoyées depuis plus de 30 jours |
| `purge-identites` | une fois par jour | Supprime les fichiers des vérifications d'identité refusées depuis plus de 30 jours |

La maintenance tourne toutes les heures plutôt qu'une fois par nuit : le serveur est à l'heure de
Paris, qui diffère de celle de Douala d'une heure en été. Elle ne fait rien quand il n'y a rien à faire.

cPanel → **Tâches Cron**. Saisir une adresse email pour être prévenu en cas d'erreur Cron, puis créer
ces quatre lignes. `flock -n` empêche deux exécutions simultanées d'une même tâche.

```cron
*/5 * * * *  cd /home/UTILISATEUR/solifund/backend && /usr/bin/flock -n /home/UTILISATEUR/tmp/solifund-reconciliation.lock /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/node dist/scripts/taches.js reconciliation >> /home/UTILISATEUR/logs/solifund-taches.log 2>&1
2-59/5 * * * *  cd /home/UTILISATEUR/solifund/backend && /usr/bin/flock -n /home/UTILISATEUR/tmp/solifund-alertes.lock /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/node dist/scripts/taches.js alertes >> /home/UTILISATEUR/logs/solifund-taches.log 2>&1
5 * * * *  cd /home/UTILISATEUR/solifund/backend && /usr/bin/flock -n /home/UTILISATEUR/tmp/solifund-maintenance.lock /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/node dist/scripts/taches.js maintenance >> /home/UTILISATEUR/logs/solifund-taches.log 2>&1
30 3 * * *  cd /home/UTILISATEUR/solifund/backend && /usr/bin/flock -n /home/UTILISATEUR/tmp/solifund-purge.lock /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/node dist/scripts/taches.js purge-identites >> /home/UTILISATEUR/logs/solifund-taches.log 2>&1
```

Vérifier une première fois à la main, en SSH :

```bash
cd ~/solifund/backend && /home/UTILISATEUR/nodevenv/solifund/backend/24/bin/node dist/scripts/taches.js alertes; echo "code : $?"
tail -n 20 ~/logs/solifund-taches.log
```

Le chemin exact de `node` est celui de l'environnement affiché par « Setup Node.js App » : à adapter si
la version ou le dossier diffèrent. Le journal grossit d'environ 600 lignes par jour : le vider de temps
en temps (`: > ~/logs/solifund-taches.log`).

## 6. Après la mise en ligne

- **Journal de l'API** : cPanel → Setup Node.js App, ou en SSH le fichier `stderr.log` / `passenger.log`
  de l'application. Au démarrage, l'API indique si la configuration est invalide et si les tâches
  internes sont désactivées.
- **Adresse des visiteurs** (`TRUST_PROXY=1`) : signaler 4 fois la même cagnotte depuis le même
  téléphone. La 4e tentative doit être refusée (« trop de requêtes »), alors qu'un autre téléphone peut
  encore signaler. Si un second téléphone est aussi refusé, toutes les requêtes semblent venir de la même
  adresse : vérifier avec o2switch le nombre de proxys devant l'application.
- **Paiements** : AangaraaPay n'a jamais été essayé en réel. Faire d'abord un petit don, puis un petit
  retrait, en suivant le journal.
- **Pages légales** : compléter les passages entre crochets de `/conditions` et `/confidentialite`
  (`frontend/src/locales/*/legal.json`) avant d'ouvrir le site au public.
- **Sauvegardes** : la base (sauvegardes cPanel / JetBackup d'o2switch) et `~/solifund-donnees/`.
