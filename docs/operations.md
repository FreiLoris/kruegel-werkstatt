# Operations

How the app is kept safe in daily operation. All commands are run in the project folder
(where `compose.yaml` is) – on the NAS via SSH or the Container Manager terminal.

## Backups

The `backup` container (own image, `backup/Dockerfile`) backs up the database every night and
deletes old backups. Installing on the NAS: [`deployment-nas.md`](deployment-nas.md).

| Setting (`.env`) | Default | Meaning |
|---|---|---|
| `BACKUP_DIR` | `./Datensicherung` | Folder for the backup files – on the NAS e.g. `/volume1/kruegeldata/Datensicherung/werkstatt` |
| `BACKUP_SCHEDULE` | `0 2 * * *` | When (cron: minute hour day month weekday), Swiss time – default every night at 02:00 |
| `BACKUP_KEEP_DAYS` | `30` | Backups older than this are deleted – the newest one always stays |

- One file per run: `werkstatt_2026-10-15_0200.dump` (PostgreSQL "custom" format, compressed).
- A file is only given its name once it is complete – a half-written backup never looks like one.
- **The backups contain customer data.** The folder must not be shared publicly and is never
  committed (`.gitignore`).
- The NAS folder `Datensicherung` should itself be copied away from the NAS (Hyper Backup, USB
  disk) – a backup on the same disk does not help if the disk fails.

Check that it runs:

```sh
docker compose logs backup          # one line per backup, with size
ls -l Datensicherung/               # or the folder from BACKUP_DIR
```

### Before an update with a database change

When a new version brings a database change (a Flyway migration), the backend backs the database
up **itself, right before** changing it – into `vor-update/` inside `BACKUP_DIR`, e.g.
`vor-update/werkstatt_2026-10-28_1847_vor-V52.dump`. Updates without a database change make none.
The latest 10 are kept; the nightly cleanup does not touch them.

- No backup, no change: if the backup cannot be written, the backend does not start (the log says
  why) – the database stays as it was. The backup container prepares the folder when it starts;
  Docker restarts the backend, so it usually sorts itself out within a minute.
- Needs the backend's `/dumps` volume and `BACKUP_BEFORE_MIGRATION_DIR` from `compose.yaml`
  (since 16k). An older `compose.yaml` on the NAS has neither – then there is no such backup until
  it is replaced (`deployment-nas.md`). In an emergency the line `BACKUP_BEFORE_MIGRATION_DIR` can
  be removed from `compose.yaml` to start without.

Back up right now (e.g. before an update):

```sh
docker compose exec backup sh /backup/backup.sh
```

## Restore

Replaces **all** data with the state of a backup.

```sh
docker compose exec backup sh /backup/restore.sh          # lists the available backups
docker compose stop backend                               # nobody may write meanwhile
docker compose exec backup sh /backup/restore.sh werkstatt_2026-10-15_0200.dump --yes
docker compose start backend
```

- Without `--yes` the script only explains what would happen.
- The restore runs in one transaction: either everything is restored or nothing changes.
- The backup contains the migration history (Flyway). If the backup is older than the app
  version, the backend brings the database up to date when it starts.
- **An update went wrong:** set `APP_VERSION` back to the version before (`deployment-nas.md`,
  "Going back") and restore its `vor-update/…` backup – otherwise the new version changes the
  database again on its next start:
  `restore.sh vor-update/werkstatt_2026-10-28_1847_vor-V52.dump --yes`.

> On Windows in Git Bash, prefix the `exec` commands with `MSYS_NO_PATHCONV=1` – otherwise Git
> Bash turns `/backup/…` into a Windows path. Not needed on the NAS.

## Tested (11c, 2026-10-07)

On a separate test instance (`docker compose -p werkstatt-backuptest`, port 8099, own volume,
fictitious data only):

1. Created a person, backup by cron (every minute for the test) – in Swiss time, with size in the log.
2. An artificially old backup (> 30 days) was deleted, the new one kept.
3. Deleted the instance **including its data volume**, started it fresh (empty database).
4. `restore.sh` without `--yes` → refused; with `--yes` → restored.
5. Backend started, Flyway validated all migrations, the person was back.

Repeat this test after larger changes to the database (new PostgreSQL version!) and at least
once a year.
