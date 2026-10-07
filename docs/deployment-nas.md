# Deployment on the Synology NAS

Target: **DS224+** (Intel Celeron J4125, 2 GB RAM), DSM 7.3, reachable in the workshop at
`http://192.168.1.50:8090`. The NAS does not build anything – CI pushes ready-made images to the
GitHub Container Registry (`ghcr.io/freiloris/kruegel-werkstatt-*`) after every merge to `main`.

Files on the NAS (nothing else from the repository is needed):

```
/volume1/docker/kruegel-werkstatt/
├── compose.yaml   ← deploy/nas/compose.yaml
└── .env           ← from deploy/nas/.env.example, with an own password
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
The repository is private, so its images are too. Either:

- **A – images public** (simplest, nothing to renew): on GitHub *Your profile → Packages →*
  each of `kruegel-werkstatt-backend`, `-frontend`, `-backup` *→ Package settings → Change
  visibility → Public*. The images contain the app's code, but no data and no passwords.
- **B – images private**: create a token on GitHub (*Settings → Developer settings → Personal
  access tokens (classic)*, only the scope `read:packages`, with an expiry date – note it in the
  calendar). On the NAS once via SSH: `sudo docker login ghcr.io -u FreiLoris` and paste the
  token as password. When it expires, updates fail until a new token is entered.

### 4. Configuration
On the PC: copy `deploy/nas/.env.example` to a file named `.env` and set **`DB_PASSWORD`** to an
own long password (letters and digits). Keep the password in the password manager.
Upload `.env` and `deploy/nas/compose.yaml` with *File Station* into
`docker/kruegel-werkstatt`. Then delete the local `.env` copy.

### 5. Create the project
*Container Manager → Projekt → Erstellen*:
- Projektname `kruegel-werkstatt`
- Pfad `/docker/kruegel-werkstatt`
- Quelle: *Vorhandene compose.yaml verwenden*
- no web portal → *Fertig*

Container Manager pulls the images and starts the four containers (db, backend, frontend, backup).
The first start takes a few minutes (download, database setup).

### 6. Check
- `http://192.168.1.50:8090` opens the app ("Wer benutzt dieses Gerät?" – nobody exists yet).
- *Container Manager → Projekt → kruegel-werkstatt*: all four containers *Wird ausgeführt*,
  db and backend *healthy*.
- The next morning there is a `werkstatt_….dump` in `Datensicherung/werkstatt` (or right away:
  container `backup` → *Terminal* → `sh /backup/backup.sh`).

## Update to the newest version

After a merge, wait until CI on `main` is green (it pushes the images), then:
*Container Manager → Projekt → kruegel-werkstatt → Aktion → Erstellen*. Because of
`pull_policy: always` it fetches the new images and restarts what changed. Database changes are
applied by the backend itself when it starts (Flyway). Before larger updates: back up first
(`docs/operations.md`).

**Going back:** set `APP_VERSION` in `.env` to the commit before (e.g. `493ba11`, the tag of
each image) and *Erstellen* again. Only possible as long as no database migration came in
between – otherwise restore the backup from before the update.

## Memory

The NAS has 2 GB, of which DSM and Surveillance Station already use about 40 %. The app is
limited to about 780 MB (db 256, backend 400, frontend 64, backup 64 MB). If the NAS becomes
slow: *Ressourcen-Monitor* – a RAM module (the DS224+ takes up to 6 GB) is the simplest help.
