#!/usr/bin/env bash
# Cloud Agent start phase: bring PostgreSQL up on every boot.
# Idempotent and safe to re-run; returns after the server is ready.
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

CLUSTER_VER="$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $1}')"
CLUSTER_VER="${CLUSTER_VER:-16}"

echo "[start] Starting PostgreSQL cluster ${CLUSTER_VER}/main..."
$SUDO pg_ctlcluster "$CLUSTER_VER" main start 2>/dev/null || true

for _ in $(seq 1 30); do
  if $SUDO -u postgres pg_isready -q; then
    echo "[start] PostgreSQL is ready."
    break
  fi
  sleep 1
done

# Ensure role/db exist even if the snapshot did not capture the data directory.
$SUDO -u postgres psql -v ON_ERROR_STOP=1 <<'SQL' || true
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goalgo') THEN
    CREATE ROLE goalgo LOGIN PASSWORD 'goalgo' SUPERUSER;
  END IF;
END $$;
SQL
$SUDO -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='goalgo'" | grep -q 1 \
  || $SUDO -u postgres createdb -O goalgo goalgo

echo "[start] Done."
