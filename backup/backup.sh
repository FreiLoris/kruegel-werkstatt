#!/bin/sh
# Backs up the database into /dumps (on the NAS: Datensicherung/werkstatt) – one file per run,
# then deletes backups older than BACKUP_KEEP_DAYS. Runs nightly (entrypoint.sh) or by hand:
#
#   docker compose exec backup sh /backup/backup.sh
#
# Format "custom" (-Fc): compressed, and pg_restore can restore it table by table if needed.
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
name="werkstatt_$(date +%Y-%m-%d_%H%M).dump"

# write to a temporary name first – a half-written file must never look like a backup
pg_dump --format=custom --file="/dumps/.${name}.partial"
mv "/dumps/.${name}.partial" "/dumps/${name}"
echo "$(date '+%Y-%m-%d %H:%M') backup ${name} ($(du -h "/dumps/${name}" | cut -f1))"

# retention: older backups go, the newest one always stays (even if the server was off for weeks)
newest="$(ls -1t /dumps/werkstatt_*.dump | head -n 1)"
find /dumps -maxdepth 1 -name 'werkstatt_*.dump' -mtime +"${KEEP_DAYS}" ! -path "${newest}" -print -delete \
  | sed 's/^/deleted (older than '"${KEEP_DAYS}"' days): /'
