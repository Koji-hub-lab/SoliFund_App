#!/usr/bin/env bash
# =====================================================================
# setup.sh — Installation initiale de Solifund (à lancer UNE fois, en root)
#
# Usage :
#   sudo FRONT_DOMAIN=solifund.exemple.com \
#        API_DOMAIN=api.solifund.exemple.com \
#        REPO_URL=git@github.com:UTILISATEUR/SoliFund_App.git \
#        CERTBOT_EMAIL=contact@exemple.com \
#        DEPLOY_PUBKEY="ssh-ed25519 AAAA... urich" \
#        ./setup.sh
#
# Ré-exécutable sans danger (idempotent). Ne touche pas aux autres sites
# nginx ni à la version de Node utilisée par les autres projets du serveur.
# =====================================================================
set -euo pipefail

FRONT_DOMAIN="${FRONT_DOMAIN:-solifund.exemple.com}"
API_DOMAIN="${API_DOMAIN:-api.solifund.exemple.com}"
REPO_URL="${REPO_URL:-git@github.com:UTILISATEUR/SoliFund_App.git}"
BRANCH="${BRANCH:-main}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@exemple.com}"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:-}"

DEPLOY_USER="deploy"
APP_DIR="/var/www/solifund"
SERVICE="solifund-api"
DB_NAME="solifund"
DB_USER="solifund"
NODE_MAJOR=22
NODE_DIR="/opt/node-solifund"

if [ "$(id -u)" -ne 0 ]; then
  echo "Lance ce script en root (sudo)." >&2; exit 1
fi
case "$FRONT_DOMAIN$API_DOMAIN$REPO_URL$CERTBOT_EMAIL" in
  *exemple*|*UTILISATEUR*)
    echo "Renseigne FRONT_DOMAIN, API_DOMAIN, REPO_URL et CERTBOT_EMAIL (voir l'en-tête du script)." >&2; exit 1 ;;
esac

as_deploy() { sudo -u "$DEPLOY_USER" -H env PATH="$NODE_DIR/bin:$PATH" "$@"; }

echo "==> [1/10] Paquets système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx \
  build-essential openssl ca-certificates xz-utils

echo "==> [2/10] Node.js ${NODE_MAJOR} (installé dans ${NODE_DIR}, sans toucher au Node du système)"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  case "$(uname -m)" in
    x86_64)  NODE_ARCH="x64" ;;
    aarch64) NODE_ARCH="arm64" ;;
    *) echo "Architecture non supportée : $(uname -m)" >&2; exit 1 ;;
  esac
  NODE_FILE="$(curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/SHASUMS256.txt" \
    | grep "linux-${NODE_ARCH}.tar.xz" | awk '{print $2}' | head -1)"
  mkdir -p "$NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/${NODE_FILE}" \
    | tar -xJ -C "$NODE_DIR" --strip-components=1
fi
"$NODE_DIR/bin/node" -v

echo "==> [3/10] Utilisateur de déploiement « ${DEPLOY_USER} »"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
SSH_DIR="/home/$DEPLOY_USER/.ssh"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
touch "$SSH_DIR/authorized_keys"
if [ -n "$DEPLOY_PUBKEY" ] && ! grep -qF "$DEPLOY_PUBKEY" "$SSH_DIR/authorized_keys"; then
  echo "$DEPLOY_PUBKEY" >> "$SSH_DIR/authorized_keys"
fi
chmod 600 "$SSH_DIR/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR/authorized_keys"

echo "==> [4/10] Accès du serveur au dépôt GitHub (clé de déploiement)"
KEY="$SSH_DIR/id_ed25519"
if [ ! -f "$KEY" ]; then
  as_deploy ssh-keygen -t ed25519 -N "" -C "solifund-server@$(hostname)" -f "$KEY"
fi
as_deploy bash -c 'ssh-keyscan -H github.com >> ~/.ssh/known_hosts 2>/dev/null; sort -u ~/.ssh/known_hosts -o ~/.ssh/known_hosts'

if [ ! -d "$APP_DIR/.git" ]; then
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$(dirname "$APP_DIR")"
  if ! as_deploy git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"; then
    echo
    echo "Clonage impossible. Ajoute cette clé publique comme « Deploy key » (lecture seule)"
    echo "dans GitHub > dépôt > Settings > Deploy keys, puis relance ce script :"
    echo
    cat "$KEY.pub"
    exit 1
  fi
fi

echo "==> [5/10] Base de données PostgreSQL + fichier .env du backend"
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  DB_PASS="$(openssl rand -hex 16)"
  JWT_SECRET="$(openssl rand -hex 48)"
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    sudo -u postgres psql -c "ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS'"
  else
    sudo -u postgres psql -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS'"
  fi
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  fi
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
JWT_SECRET="$JWT_SECRET"
FRONTEND_URL="https://$FRONT_DOMAIN"
BACKEND_URL="https://$API_DOMAIN"

# A COMPLETER (à copier depuis le .env local, jamais dans Git) :
# BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NOM,
# clés du fournisseur de paiement, GOOGLE_* (si activé)
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "   .env créé : pense à y ajouter les clés Brevo / paiement."
else
  echo "   .env déjà présent, conservé tel quel."
fi
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/backend/uploads/cagnottes"
echo "VITE_API_URL=https://$API_DOMAIN" | as_deploy tee "$APP_DIR/frontend/.env.production" >/dev/null

echo "==> [6/10] Service systemd « ${SERVICE} »"
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=Solifund API (NestJS)
After=network.target postgresql.service

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$ENV_FILE
ExecStart=$NODE_DIR/bin/node dist/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$SERVICE"

echo "==> [7/10] Droits limités pour le redémarrage depuis deploy.sh"
SYSTEMCTL="$(command -v systemctl)"
SUDOERS="/etc/sudoers.d/solifund-deploy"
echo "$DEPLOY_USER ALL=(root) NOPASSWD: $SYSTEMCTL restart $SERVICE, $SYSTEMCTL reload nginx, $SYSTEMCTL status $SERVICE" > "$SUDOERS"
chmod 440 "$SUDOERS"
visudo -cf "$SUDOERS"

echo "==> [8/10] Configuration nginx"
cat > /etc/nginx/sites-available/solifund-front <<'EOF'
server {
    listen 80;
    server_name __FRONT_DOMAIN__;
    root __APP_DIR__/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
cat > /etc/nginx/sites-available/solifund-api <<'EOF'
server {
    listen 80;
    server_name __API_DOMAIN__;
    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
EOF
sed -i "s|__FRONT_DOMAIN__|$FRONT_DOMAIN|g; s|__APP_DIR__|$APP_DIR|g" /etc/nginx/sites-available/solifund-front
sed -i "s|__API_DOMAIN__|$API_DOMAIN|g" /etc/nginx/sites-available/solifund-api
ln -sf /etc/nginx/sites-available/solifund-front /etc/nginx/sites-enabled/solifund-front
ln -sf /etc/nginx/sites-available/solifund-api /etc/nginx/sites-enabled/solifund-api
nginx -t

echo "==> [9/10] Premier déploiement (build + migrations + démarrage) et rôles de base"
as_deploy bash "$APP_DIR/deploy/deploy.sh"
as_deploy bash -c "cd '$APP_DIR/backend' && npx prisma db seed"
systemctl reload nginx

echo "==> [10/10] Certificat HTTPS (Let's Encrypt)"
certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect \
  -d "$FRONT_DOMAIN" -d "$API_DOMAIN" \
  || echo "ATTENTION : certbot a échoué (DNS pas encore propagé ?). Relance : certbot --nginx -d $FRONT_DOMAIN -d $API_DOMAIN"

echo
echo "Installation terminée."
echo "  Site : https://$FRONT_DOMAIN"
echo "  API  : https://$API_DOMAIN"
echo "N'oublie pas de compléter $ENV_FILE puis : sudo systemctl restart $SERVICE"