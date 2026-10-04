# Krügel Werkstatt

[![CI](https://github.com/FreiLoris/kruegel-werkstatt/actions/workflows/ci.yml/badge.svg)](https://github.com/FreiLoris/kruegel-werkstatt/actions/workflows/ci.yml)

Scheduling tool for the workshop of Krügel Fahrzeugtechnik:
appointments & tasks, lift occupancy, courtesy cars, pinboard, to-dos and employee calendar.

Rebuild of the existing workshop app (Node.js + one HTML file) as a cleanly structured
application. Runs in the internal network on the Synology NAS; the dashboard is also shown
on a TV in the workshop.

The app speaks German to its users; the code is English – see the [glossary](docs/glossary.md).

## Architecture

```
Browser / tablet / TV
        │
        ▼
┌───────────────┐      /api/*      ┌───────────────┐      JDBC      ┌───────────────┐
│   frontend    │ ───────────────▶ │    backend    │ ─────────────▶ │      db       │
│ nginx + React │                  │  Spring Boot  │                │  PostgreSQL   │
└───────────────┘                  └───────────────┘                └───────────────┘
```

Three containers in one Docker Compose setup. Why these technologies:
[`docs/adr/0001-tech-stack.md`](docs/adr/0001-tech-stack.md).

## Project structure

| Folder | Content |
|---|---|
| `backend/` | Spring Boot (Java, Maven) – REST API, business logic, database access |
| `frontend/` | React + TypeScript (Vite) – web interface |
| `api/` | `openapi.json` – API contract between backend and frontend (generated, committed) |
| `docs/roadmap.md` | Plan of all packages + tracking of the bugs from the analysis |
| `docs/conventions.md` | Binding rules for code, database, time, tests |
| `docs/glossary.md` | German domain terms ↔ English code names |
| `docs/adr/` | Architecture Decision Records |
| `docs/analysis/` | Analysis of the old app: features, bugs, UI review with screenshots (German) |

## Running locally

Requirement: **JDK 25** (in IntelliJ: *File → Project Structure → SDK*). Maven does not need
to be installed – the Maven wrapper (`mvnw`) downloads the right version itself.

Also: **Docker Desktop** must be running (for the database and for the tests).

Configuration: the defaults are enough locally. To change them, copy `.env.example` to `.env`.

There are two ways to start the app:

### Option A – everything in Docker (like later on the NAS)

```bash
docker compose up -d --build    # build + start
docker compose ps               # container status
docker compose logs -f backend  # follow the logs of a container
docker compose down             # stop – data is kept
docker compose down -v          # stop AND delete data (fresh database)
```

App: **http://localhost:8090** (from the network: `http://<computer-name>:8090`).
The backend is only reachable internally – all calls go through nginx (`/api/*`).

### Option B – development (hot reload)

Only the database runs in Docker, backend and frontend run directly on the computer.
Code changes are visible immediately without rebuilding images.

#### 1. Database

```bash
docker compose up -d db     # only start PostgreSQL (port 5432, only reachable locally)
```

#### 2. Backend

```bash
cd backend
./mvnw spring-boot:run      # Windows: mvnw.cmd spring-boot:run
./mvnw test                 # tests – start their own Postgres via Testcontainers
```

Runs on http://localhost:8080 – health check: http://localhost:8080/api/health,
API documentation (Swagger UI): http://localhost:8080/api/docs
(also shows whether the database is reachable).

On startup **Flyway** automatically runs all new migrations from
`backend/src/main/resources/db/migration`.

`spring-boot:run` starts in the **dev** profile and creates sample data in an empty database
(e.g. 5 employees). The Docker image (option A / NAS) starts without sample data.

> The local Docker stack (option A) and the development backend share the same database.
> A migration of an unmerged branch applied by the development backend ends up in it too.

#### 3. Frontend

Requirement: **Node.js 22** (or newer).

```bash
cd frontend
npm install                 # once, or after changes to package.json
npm run dev                 # development server with hot reload
npm run lint                # code check (oxlint)
npm test                    # tests (Vitest)
npm run build               # type check + production build into dist/
```

Runs on http://localhost:5173. Calls to `/api/*` are forwarded by Vite to the backend
(`localhost:8080`) – so the backend has to be running.

## Roadmap

Detailed plan with all packages: [`docs/roadmap.md`](docs/roadmap.md)

| Phase | Topic | Status |
|---|---|---|
| 1 | Skeleton | ✅ |
| 2 | Foundation (CI, conventions, UI components, live updates) | ✅ |
| 3 | Employees | ✅ |
| 4–10 | Business modules: master data, customers/import, tasks, courtesy cars, to-dos/pinboard, absences, dashboard | in progress |
| 11 | Migration & go-live on the NAS | |

## Way of working

- `main` is always runnable.
- Every change in its own branch, merged through a pull request.
- Branch names: `feat/…`, `fix/…`, `refactor/…`, `chore/…`, `docs/…`
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) checks every PR:
  backend tests, frontend lint + tests + build, Docker images. Merge only when everything is green.
