#!/bin/sh
# Aiaddin / Railway: kurulum sihirbazı yerine boş DB'de database.sql + storage/installed
set -e
cd /app

# Kurtarma: önceki deploy'dan kalan storage/installed ama MySQL boş/yenilendiyse — import'un çalışması için işareti kaldır
if [ -f storage/installed ] && [ -n "$DB_HOST" ] && [ -n "$DB_DATABASE" ] && [ -n "$DB_USERNAME" ]; then
  export MYSQL_PWD="${DB_PASSWORD:-}"
  if mysql -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USERNAME" "$DB_DATABASE" -e "SELECT 1" >/dev/null 2>&1; then
    RCOUNT="$(mysql -N -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USERNAME" "$DB_DATABASE" \
      -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();" 2>/dev/null || echo 0)"
    if [ "$RCOUNT" = "0" ]; then
      echo "aiaddin: removing stale storage/installed (database has no tables)"
      rm -f storage/installed
    fi
  fi
  unset MYSQL_PWD
fi

AUTO_DB="${AIADDIN_AUTO_DATABASE:-1}"
SQL_FILE="public/installer/database.sql"
READY=0

if [ "$AUTO_DB" != "0" ] && [ "$AUTO_DB" != "false" ] && [ -f "$SQL_FILE" ] \
   && [ -n "$DB_HOST" ] && [ -n "$DB_DATABASE" ] && [ -n "$DB_USERNAME" ]; then
  export MYSQL_PWD="${DB_PASSWORD:-}"
  if mysql -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USERNAME" "$DB_DATABASE" -e "SELECT 1" >/dev/null 2>&1; then
    COUNT="$(mysql -N -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USERNAME" "$DB_DATABASE" \
      -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();" 2>/dev/null || echo 0)"
    if [ "$COUNT" != "0" ]; then
      echo "aiaddin: database already has ${COUNT} table(s)."
      READY=1
    else
      echo "aiaddin: empty database — importing ${SQL_FILE} (this may take a minute)..."
      mysql -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USERNAME" "$DB_DATABASE" \
        --default-character-set=utf8mb4 < "$SQL_FILE"
      echo "aiaddin: SQL import finished."
      READY=1
    fi
  else
    echo "aiaddin: cannot reach MySQL (DB_*); not marking installed."
  fi
  unset MYSQL_PWD
elif [ "$AUTO_DB" != "0" ] && [ "$AUTO_DB" != "false" ]; then
  echo "aiaddin: DB_* not set or ${SQL_FILE} missing — not marking installed."
fi

if [ "$READY" = "1" ] && [ ! -f storage/installed ]; then
  touch storage/installed
  echo "aiaddin: created storage/installed (skip web installer)."
fi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
