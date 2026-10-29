# Deployment on the Synology NAS

Target: **DS224+** (Intel Celeron J4125, 2 GB RAM), DSM 7.3, reachable in the workshop at
`http://192.168.1.50:8090`. The NAS does not build anything – it pulls ready-made images from the
GitHub Container Registry (`ghcr.io/freiloris/kruegel-werkstatt-*`), and only **released**
versions (see [Releases](#releases)). Watchtower in the project updates the app by itself.

Files on the NAS (nothing else from the repository is needed):

```
/volume1/docker/kruegel-werkstatt/
├── compose.yaml   ← deploy/compose.yaml
└── .env           ← from deploy/release.env.example, with an own password
/volume1/kruegeldata/Datensicherung/werkstatt/   ← nightly backups (docs/operations.md)
```

Labels below are those of the German DSM.

## One-time setup

### 1. Install Container Manager
*Paket-Zentrum* → search "Container Manager" → *Installieren*. This also creates the shared
folder `docker`.

### 2. Create the folders
*File Station*:
- in `docker`: new folder `kruegel-werkstatt`
- in `kruegeldata/Datensicherung`: new folder `werkstatt`

### 3. Access to the images
Images of a private repository are private as well. Either:

- **A – images public** (simplest, nothing to renew): on GitHub *Your profile → Packages →*
  each of `kruegel-werkstatt-backend`, `-frontend`, `-backup` *→ Package settings → Change
  visibility → Public*. The images contain the app's code, but no data and no passwords.
- **B – images private**: create a token on GitHub (*Settings → Developer settings → Personal
  access tokens (classic)*, only the scope `read:packages`, with an expiry date – note it in the
  calendar). On the NAS once via SSH: `sudo docker login ghcr.io -u FreiLoris` and paste the
  token as password. When it expires, updates fail until a new token is entered. Watchtower
  does not see this login: it needs `REPO_USER`/`REPO_PASS` in its environment as well.

Today the images are public (A).

### 4. Configuration
On the PC: copy `deploy/release.env.example` to a file named `.env` and set **`DB_PASSWORD`** to
an own long password (letters and digits). Keep the password in the password manager.
Upload `.env` and `deploy/compose.yaml` with *File Station* into
`docker/kruegel-werkstatt`. Then delete the local `.env` copy.

### 5. Create the project
*Container Manager → Projekt → Erstellen*:
- Projektname `kruegel-werkstatt`
- Pfad `/docker/kruegel-werkstatt`
- Quelle: *Vorhandene compose.yaml verwenden*
- no web portal → *Fertig*

Container Manager pulls the images and starts the five containers (db, backend, frontend, backup,
watchtower).
The first start takes a few minutes (download, database setup).

### 6. Check
- `http://192.168.1.50:8090` opens the app ("Wer benutzt dieses Gerät?" – nobody exists yet).
- *Container Manager → Projekt → kruegel-werkstatt*: all five containers *Wird ausgeführt*,
  db and backend *healthy*.
- The next morning there is a `werkstatt_….dump` in `Datensicherung/werkstatt` (or right away:
  container `backup` → *Terminal* → `sh /backup/backup.sh`).

## Releases

Two channels of the same images:

| Channel | Tag | Comes with | Instances |
|---|---|---|---|
| dev | `dev` (+ commit, e.g. `408d8e8`) | every merge to `main`, as soon as CI is green | Reto's computer in the office, Loris' computer – [test instances](#test-instances-dev) |
| release | `latest` (+ version, e.g. `v1.2.0`) | a release | the NAS in the workshop |

**Releasing:** when the dev state was tried on the test instances – GitHub → *Actions → Release →
Run workflow*, branch `main`, version e.g. `1.2.0` (or `gh workflow run release.yml -f
version=1.2.0`). The workflow gives the images CI built for the newest `main` the tags `v1.2.0`
and `latest` – nothing is built again, the workshop gets exactly what was tested – and creates a
GitHub release with the merged PRs as release notes. Version numbers: the last digit for fixes,
the middle one for new functions, the first one for big steps.

Within 5 minutes Watchtower on the NAS sees the new `latest`, pulls it and restarts backend,
frontend and backup (the app is gone for about a minute). Database changes are applied by the
backend itself when it starts (Flyway) – right before, it backs the database up into
`Datensicherung/werkstatt/vor-update` (`docs/operations.md`). When Watchtower looks is `UPDATE_SCHEDULE` in `.env` – e.g. only at
lunch, if a restart during work disturbs. The database (PostgreSQL) is never updated by
Watchtower.

**What Watchtower did:** *Container Manager → Container → watchtower → Protokoll*.

**Going back:** set `APP_VERSION` in `.env` to the version before (e.g. `v1.1.0`) and
*Projekt → Aktion → Erstellen*; Watchtower then stays on it. Only possible as long as no database
migration came in between – otherwise restore the backup from before the update. Back to the
releases: `APP_VERSION=latest` and *Erstellen* again.

### Taking over a new `compose.yaml`

Watchtower only exchanges images – a change of `deploy/compose.yaml` (e.g. 16k: the backend gets
the backup folder for the backup before an update) reaches the NAS only by hand: replace
`/volume1/docker/kruegel-werkstatt/compose.yaml` with the new `deploy/compose.yaml` – the `.env`
stays as it is – then *Projekt → Stopp* and *Erstellen*.

After taking over 16k, check once that the backend can write its backup before an update (on a
Synology share the folder rights may not take): *Container → backend → Terminal* →
`touch /dumps/vor-update/.probe && rm /dumps/vor-update/.probe` – no message = fine. Else give the
folder `Datensicherung/werkstatt/vor-update` write access for everyone in File Station.

### SMS reminders (17c)

Customers get an SMS the working day before their appointment (*Einstellungen → Kundenerinnerungen*,
off until turned on there). The SMS go out by the workshop's ASPSMS account: in the NAS's `.env`
`ASPSMS_USERKEY` and `ASPSMS_PASSWORD` (aspsms.com → Userkey, API password), and the `compose.yaml`
from 17c on (it hands them to the backend – take it over as above). The settings then say
*SMS: eingerichtet*. Credit runs out: the reminder says «Kein Guthaben bei ASPSMS» – top up on
aspsms.com. A test instance (`APP_VERSION=dev`) never sends SMS, even with the access in its `.env`.

### Switching an older NAS project to Watchtower

Projects set up before 11f (four containers, no watchtower) once: replace
`/volume1/docker/kruegel-werkstatt/compose.yaml` with `deploy/compose.yaml` – the `.env` stays as it
is – then *Projekt → Stopp* and *Erstellen*. Until the first release the NAS keeps the version it
has.

## Test instances (dev)

Same `deploy/compose.yaml`, but the dev channel and only test data. On a computer with Docker
Desktop (Windows: started with the computer, *Settings → General → Start Docker Desktop when you
sign in*):

1. A folder, e.g. `C:\kruegel-werkstatt`, with `deploy/compose.yaml` as `compose.yaml` and
   `deploy/dev.env.example` as `.env` – set `DB_PASSWORD`.
2. In that folder: `docker compose -p werkstatt-dev up -d` (own project name: on a developer
   computer it never mixes with the stack built from the repository – stop that one first with
   `docker compose down` in the repository, both want port 8090)
3. `http://localhost:8090`

From then on Watchtower fetches every merge by itself (within 5 minutes after CI on `main` is
green). Watchtower updates only containers of this app (label `com.centurylinklabs.watchtower.enable`),
nothing else that runs in Docker on that computer.

## Memory

The NAS has 2 GB, of which DSM and Surveillance Station already use about 40 %. The app is
limited to about 900 MB (db 256, backend 512, frontend 64, backup 64 MB). If the NAS becomes
slow: *Ressourcen-Monitor* – a RAM module (the DS224+ takes up to 6 GB) is the simplest help.

The backend had 400 MB until 10/2026. After phase 12 it used 375 MB right after the start (peak
397 MB): one step from being stopped by Docker, which would look like "the app is suddenly
gone and comes back after a minute". Now 512 MB, of which Java takes at most half as heap.

**The limits are in `compose.yaml`, which is a copy on the NAS** – an update of the images does
not change them. After a change here: replace `/volume1/docker/kruegel-werkstatt/compose.yaml`
with `deploy/compose.yaml` (or change the two lines in *Projekt → YAML-Konfiguration*), then
*Stopp* and *Erstellen*.
