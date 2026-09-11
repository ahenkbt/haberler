#!/usr/bin/env bash
# Cloud Agent install phase for the goalgo (Yekpare) app.
# Idempotent: installs PostgreSQL + workspace deps, provisions the local dev DB,
# and applies Drizzle migrations. Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/goalgo"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

echo "[install] Installing PostgreSQL..."
export DEBIAN_FRONTEND=noninteractive
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  $SUDO apt-get update -y
  $SUDO apt-get install -y --no-install-recommends postgresql postgresql-contrib
fi

echo "[install] Starting PostgreSQL cluster..."
$SUDO pg_ctlcluster "$(pg_lsclusters -h | awk 'NR==1{print $1}')" main start 2>/dev/null || true
# Wait until the server accepts connections.
for _ in $(seq 1 30); do
  if $SUDO -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "[install] Provisioning goalgo role and database (idempotent)..."
$SUDO -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goalgo') THEN
    CREATE ROLE goalgo LOGIN PASSWORD 'goalgo' SUPERUSER;
  END IF;
END $$;
SQL
$SUDO -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='goalgo'" | grep -q 1 \
  || $SUDO -u postgres createdb -O goalgo goalgo

echo "[install] Installing workspace dependencies (pnpm)..."
cd "$APP_DIR"
pnpm install

echo "[install] Applying database migrations..."
export DATABASE_URL="${DATABASE_URL:-postgresql://goalgo:goalgo@127.0.0.1:5432/goalgo}"
pnpm --filter @workspace/api-server run db:migrate

echo "[install] Done."
