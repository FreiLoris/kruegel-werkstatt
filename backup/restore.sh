#!/bin/sh
# Restores a backup – REPLACES everything in the database with the state of the backup.
#
#   docker compose stop backend
#   docker compose exec backup sh /backup/restore.sh werkstatt_2026-10-15_0200.dump --yes
#   docker compose start backend
#
# The backend must be stopped (it holds connections and would keep writing). The file name is
# relative to /dumps (= Datensicherung on the NAS). Without --yes nothing happens.
set -eu

if [ "$#" -lt 1 ]; then
  echo "Usage: restore.sh <backup file in Datensicherung> --yes"
  echo "Available:"
  ls -1t /dumps/werkstatt_*.dump 2>/dev/null | sed 's#^/dumps/#  #' || echo "  (none)"
  exit 1
fi

file="/dumps/$1"
if [ ! -f "${file}" ]; then
  echo "Not found: $1"
  exit 1
fi
if [ "${2:-}" != "--yes" ]; then
  echo "This replaces ALL data in database '${PGDATABASE}' with the state of $1."
  echo "Stop the backend first (docker compose stop backend), then repeat with --yes."
  exit 1
fi

# --clean --if-exists: drop what is there, then create it from the backup (incl. Flyway history)
# --single-transaction: either everything is restored or nothing changes
pg_restore --clean --if-exists --no-owner --single-transaction --dbname="${PGDATABASE}" "${file}"
echo "$(date '+%Y-%m-%d %H:%M') restored $1 – now: docker compose start backend"
