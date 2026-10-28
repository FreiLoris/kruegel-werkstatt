#!/bin/sh
# Starts the nightly backup: cron in the foreground, so "docker compose logs backup" shows every
# run. Time zone Europe/Zurich (TZ), so 02:00 is 02:00 in the workshop – also in summer time.
set -eu

# The backend backs the database up here before an update with a database change – it does not
# run as root, so the folder is made writable for it (only this subfolder, not the nightly ones).
# A failure must not stop the nightly backups – the backend then says it cannot write there.
if ! { mkdir -p /dumps/vor-update && chmod 1777 /dumps/vor-update; }; then
  echo "WARNING: /dumps/vor-update could not be prepared – no backup before updates"
fi

# cron starts its jobs with an almost empty environment – hand over what backup.sh needs
export -p | grep -E "^export (PG[A-Z]+|BACKUP_[A-Z_]+|TZ)=" > /etc/backup.env

echo "${BACKUP_SCHEDULE:-0 2 * * *} . /etc/backup.env; sh /backup/backup.sh" > /etc/crontabs/root
echo "Backups: '${BACKUP_SCHEDULE:-0 2 * * *}' (${TZ:-UTC}), kept ${BACKUP_KEEP_DAYS:-30} days, into /dumps"
exec crond -f -l 8
