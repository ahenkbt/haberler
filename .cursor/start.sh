#!/usr/bin/env bash
# Cloud Agent start: per-boot reconciliation. Must tolerate restarts and then return.
# Starts PostgreSQL, ensures the dev role/db, and applies any pending migrations.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GOALGO_DIR="$REPO_ROOT/goalgo"

# Start the Postgres cluster (no-op if already running).
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

# Ensure role/db exist even if a snapshot did not capture them.
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='goalgo'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER goalgo WITH PASSWORD 'goalgo' CREATEDB;"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='goalgo'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE goalgo OWNER goalgo;"
fi

# Apply migrations (idempotent). Non-fatal so a transient issue does not block boot.
if [ -f "$GOALGO_DIR/.env" ]; then
  (cd "$GOALGO_DIR" && pnpm --filter @workspace/api-server run db:migrate) || \
    echo "[start] db:migrate reported an issue (non-fatal)"
fi

echo "[start] ready."
