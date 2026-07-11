#!/bin/sh
set -e

echo "[railway-start] DATABASE_URL kontrolü..."
if [ -z "$DATABASE_URL" ]; then
  echo "[railway-start] HATA: DATABASE_URL tanımlı değil. Postgres servisini bu servisle linkleyin."
  exit 1
fi

if [ -n "$RAILWAY_ENVIRONMENT" ] && [ -z "$PGSSLMODE" ]; then
  export PGSSLMODE=require
  echo "[railway-start] PGSSLMODE=require (Railway Postgres TLS)"
fi

echo "[railway-start] Şema: npm run db:push"
npm run db:push

if [ -d "./plugins" ] && [ -n "$(ls -A ./plugins 2>/dev/null)" ]; then
  if command -v psql >/dev/null 2>&1; then
    echo "[railway-start] Eklenti SQL migrasyonları..."
    bash scripts/run-plugin-migrations.sh || echo "[railway-start] Eklenti migrasyonları atlandı veya zaten uygulandı."
  else
    echo "[railway-start] UYARI: psql yok; eklenti migrasyonları atlandı."
  fi
fi

echo "[railway-start] API başlatılıyor..."
exec node dist/index.js
