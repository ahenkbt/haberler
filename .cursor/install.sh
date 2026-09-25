#!/usr/bin/env bash
# Cloud Agent install: idempotent, one-time repository bootstrap.
# Prepares PostgreSQL, the local .env, dependencies, the API build and the DB schema
# for the Yekpare (goalgo) app. Safe to re-run.
set -euo pipefail

# Never let corepack block on an interactive "download pnpm?" prompt during an
# unattended boot.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GOALGO_DIR="$REPO_ROOT/goalgo"

echo "[install] repo root: $REPO_ROOT"

# 1) PostgreSQL system package (Neon/Postgres in prod; local Postgres for dev).
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "[install] installing PostgreSQL..."
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

# 2) Ensure the default cluster is running and ready.
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

# 3) Create the dev role and database (idempotent).
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='goalgo'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER goalgo WITH PASSWORD 'goalgo' CREATEDB;"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='goalgo'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE goalgo OWNER goalgo;"
fi

# 4) Local dev env file (git-ignored). Only non-secret local defaults.
if [ ! -f "$GOALGO_DIR/.env" ]; then
  echo "[install] writing goalgo/.env"
  cat > "$GOALGO_DIR/.env" <<'EOF'
DATABASE_URL=postgresql://goalgo:goalgo@127.0.0.1:5432/goalgo
SESSION_SECRET=local_dev_session_secret_change_me_1234567890
NODE_ENV=development
PORT=3000
SKIP_TR_ADDRESS_IMPORT=1
EOF
fi

# 5) Dependencies.
corepack enable >/dev/null 2>&1 || true
# Pre-provision the pinned pnpm so later shells (terminals) never hit a prompt.
corepack prepare pnpm@9.15.5 --activate >/dev/null 2>&1 || true
echo "[install] installing goalgo dependencies..."
cd "$GOALGO_DIR"
pnpm install --frozen-lockfile

# Root repo holds the Cloudflare Worker tooling + worker tests; install if a lockfile exists.
if [ -f "$REPO_ROOT/pnpm-lock.yaml" ]; then
  echo "[install] installing root (Cloudflare tooling) dependencies..."
  (cd "$REPO_ROOT" && pnpm install --frozen-lockfile) || echo "[install] root install skipped/failed (non-fatal)"
fi

# 6) Build the API bundle and apply the DB schema (idempotent).
echo "[install] building api-server..."
cd "$GOALGO_DIR"
pnpm --filter @workspace/api-server run build
echo "[install] applying database migrations..."
pnpm --filter @workspace/api-server run db:migrate

echo "[install] done."
