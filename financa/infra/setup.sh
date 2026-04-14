#!/usr/bin/env bash
# VPS provisioning script for Hostinger Ubuntu 22.04
# Run as root: bash setup.sh
set -euo pipefail

echo "=== Finança VPS Setup ==="

# --- System packages ---
apt-get update -q
apt-get install -y -q \
    curl wget git unzip \
    ca-certificates gnupg lsb-release \
    postgresql-client \
    ufw fail2ban

# --- Docker ---
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -q
    apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
fi

# --- Caddy ---
if ! command -v caddy &>/dev/null; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] \
        https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
        > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -q && apt-get install -y -q caddy
fi

# --- Firewall ---
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Caddy redirect)
ufw allow 443/tcp  # HTTPS
ufw --force enable

# --- App directory ---
APP_DIR=/opt/financa
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# --- Clone or pull repo ---
if [ -d ".git" ]; then
    git pull
else
    echo "Copy your financa/ directory to $APP_DIR and re-run, or git clone here."
fi

# --- .env ---
if [ ! -f "$APP_DIR/infra/.env" ]; then
    cp "$APP_DIR/infra/.env.example" "$APP_DIR/infra/.env"
    echo ""
    echo "!! Edit $APP_DIR/infra/.env with real secrets before running docker compose !!"
fi

# --- Caddy config ---
mkdir -p /var/log/caddy
cp "$APP_DIR/infra/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy || systemctl start caddy

# --- Cron for backups ---
(crontab -l 2>/dev/null || true; echo "0 3 * * * $APP_DIR/infra/backup.sh >> /var/log/financa-backup.log 2>&1") \
    | sort -u | crontab -

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Edit $APP_DIR/infra/.env"
echo "  2. cd $APP_DIR/infra && docker compose up -d"
echo "  3. docker compose exec backend alembic upgrade head"
echo "  4. Update Caddyfile with your real domain"
