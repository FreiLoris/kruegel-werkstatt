# Krügel Werkstatt

[![CI](https://github.com/FreiLoris/kruegel-werkstatt/actions/workflows/ci.yml/badge.svg)](https://github.com/FreiLoris/kruegel-werkstatt/actions/workflows/ci.yml)

Dispositions-Tool für die Werkstatt von Krügel Fahrzeugtechnik:
Termine & Aufträge, Lift-Belegung, Ersatzwagen, Pinnwand, To-dos und Mitarbeiterkalender.

Neubau der bestehenden Werkstatt-App (Node.js + eine HTML-Datei) als sauber strukturierte
Anwendung. Läuft im internen Netzwerk auf dem Synology-NAS, das Dashboard wird zusätzlich
auf einem TV in der Werkstatt angezeigt.

## Architektur

```
Browser / Tablet / TV
        │
        ▼
┌───────────────┐      /api/*      ┌───────────────┐      JDBC      ┌───────────────┐
│   frontend    │ ───────────────▶ │    backend    │ ─────────────▶ │      db       │
│ nginx + React │                  │  Spring Boot  │                │  PostgreSQL   │
└───────────────┘                  └───────────────┘                └───────────────┘
```

Drei Container in einem Docker Compose. Begründung der Technologie-Wahl:
[`docs/adr/0001-tech-stack.md`](docs/adr/0001-tech-stack.md).

## Projektstruktur

| Ordner | Inhalt |
|---|---|
| `backend/` | Spring Boot (Java, Maven) – REST-API, Geschäftslogik, Datenbankzugriff |
| `frontend/` | React + TypeScript (Vite) – Weboberfläche |
| `api/` | `openapi.json` – API-Vertrag zwischen Backend und Frontend (generiert, eingecheckt) |
| `docs/roadmap.md` | Plan aller Pakete + Nachverfolgung der Bugs aus der Analyse |
| `docs/konventionen.md` | Verbindliche Regeln für Code, Datenbank, Zeit, Tests |
| `docs/adr/` | Architektur-Entscheide (*Architecture Decision Records*) |
| `docs/analyse/` | Analyse der alten App: Funktionsumfang, Bugs, UI-Review mit Screenshots |

## Lokal starten

Voraussetzung: **JDK 25** (in IntelliJ: *File → Project Structure → SDK*). Maven muss nicht
installiert sein – der Maven Wrapper (`mvnw`) lädt die richtige Version selbst.

Zusätzlich: **Docker Desktop** muss laufen (für die Datenbank und für die Tests).

Konfiguration: Standardwerte reichen lokal. Zum Anpassen `.env.example` nach `.env` kopieren.

Es gibt zwei Arten, die App zu starten:

### Variante A – Alles in Docker (wie später auf dem NAS)

```bash
docker compose up -d --build    # bauen + starten
docker compose ps               # Status der Container
docker compose logs -f backend  # Logs eines Containers verfolgen
docker compose down             # stoppen – Daten bleiben erhalten
docker compose down -v          # stoppen UND Daten löschen (frische DB)
```

App: **http://localhost:8090** (aus dem Netzwerk: `http://<rechnername>:8090`).
Das Backend ist nur intern erreichbar – alle Aufrufe gehen über nginx (`/api/*`).

### Variante B – Entwicklung (Hot Reload)

Nur die Datenbank läuft in Docker, Backend und Frontend direkt auf dem Rechner.
Änderungen am Code sind so sofort sichtbar, ohne Images neu zu bauen.

#### 1. Datenbank

```bash
docker compose up -d db     # nur PostgreSQL starten (Port 5432, nur lokal erreichbar)
```

#### 2. Backend

```bash
cd backend
./mvnw spring-boot:run      # Windows: mvnw.cmd spring-boot:run
./mvnw test                 # Tests – starten eigenes Postgres via Testcontainers
```

Läuft auf http://localhost:8080 – Health-Check: http://localhost:8080/api/health,
API-Dokumentation (Swagger UI): http://localhost:8080/api/docs
(zeigt auch, ob die Datenbank erreichbar ist).

Beim Start führt **Flyway** automatisch alle neuen Migrationen aus
`backend/src/main/resources/db/migration` aus.

`spring-boot:run` startet im Profil **dev** und legt bei leerer Datenbank Testdaten an
(z. B. 5 Mitarbeiter). Das Docker-Image (Variante A / NAS) startet ohne Testdaten.

#### 3. Frontend

Voraussetzung: **Node.js 22** (oder neuer).

```bash
cd frontend
npm install                 # einmalig bzw. nach Änderungen an package.json
npm run dev                 # Entwicklungsserver mit Hot Reload
npm run lint                # Code-Prüfung (oxlint)
npm test                    # Tests (Vitest)
npm run build               # Typprüfung + Produktions-Build nach dist/
```

Läuft auf http://localhost:5173. Aufrufe nach `/api/*` leitet Vite ans Backend
(`localhost:8080`) weiter – das Backend muss also laufen.

## Roadmap

Detaillierter Plan mit allen Paketen: [`docs/roadmap.md`](docs/roadmap.md)

| Phase | Thema | Status |
|---|---|---|
| 1 | Grundgerüst | ✅ |
| 2 | Fundament (CI, Konventionen, UI-Bausteine, Live-Updates) | ✅ |
| 3–10 | Fachmodule: Mitarbeiter, Stammdaten, Kunden/Import, Aufträge, Ersatzwagen, To-dos/Pinnwand, Abwesenheiten, Dashboard | |
| 11 | Migration & Go-Live auf dem NAS | |

## Arbeitsweise

- `main` ist immer lauffähig.
- Jede Änderung in einem eigenen Branch, Merge über Pull Request.
- Branch-Namen: `feat/…`, `fix/…`, `chore/…`, `docs/…`
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) prüft jeden PR:
  Backend-Tests, Frontend-Lint + Build, Docker-Images. Gemergt wird nur, wenn alles grün ist.
