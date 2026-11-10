#!/usr/bin/env bash
# =====================================================================
# deploy.sh — Mise à jour de Solifund (à lancer en tant qu'utilisateur « deploy »)
#
# Depuis ta machine :
#   ssh deploy@SERVEUR 'bash /var/www/solifund/deploy/deploy.sh'
# =====================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/solifund}"
BRANCH="${BRANCH:-main}"
SERVICE="solifund-api"
export PATH="/opt/node-solifund/bin:$PATH"

cd "$APP_DIR"

echo "==> Récupération du code (branche $BRANCH)"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Backend : dépendances, Prisma, build"
cd "$APP_DIR/backend"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
if [ ! -f dist/main.js ]; then
  echo "ERREUR : dist/main.js introuvable après le build (vérifier tsconfig.build.json)." >&2
  exit 1
fi

echo "==> Frontend : dépendances et build"
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> Redémarrage des services"
sudo systemctl restart "$SERVICE"
sudo systemctl reload nginx

echo "==> Vérification"
sleep 4
if curl -fsS http://127.0.0.1:3000/ >/dev/null; then
  echo "Déploiement réussi : l'API répond."
else
  echo "ERREUR : l'API ne répond pas. Derniers logs :" >&2
  sudo systemctl status "$SERVICE" | tail -n 25 >&2 || true
  exit 1
fi