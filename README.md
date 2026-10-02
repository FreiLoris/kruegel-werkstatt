# Krügel Werkstatt

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
| `docs/adr/` | Architektur-Entscheide (*Architecture Decision Records*) |
| `docs/analyse/` | Analyse der alten App: Funktionsumfang, Bugs, UI-Review mit Screenshots |

## Lokal starten

Voraussetzung: **JDK 25** (in IntelliJ: *File → Project Structure → SDK*). Maven muss nicht
installiert sein – der Maven Wrapper (`mvnw`) lädt die richtige Version selbst.

Zusätzlich: **Docker Desktop** muss laufen (für die Datenbank und für die Tests).

### 1. Datenbank

```bash
docker compose up -d        # PostgreSQL starten (Port 5432)
docker compose down         # stoppen – Daten bleiben erhalten
docker compose down -v      # stoppen UND Daten löschen (frische DB)
```

Zugangsdaten: Standardwerte reichen lokal. Zum Anpassen `.env.example` nach `.env` kopieren.

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run      # Windows: mvnw.cmd spring-boot:run
./mvnw test                 # Tests – starten eigenes Postgres via Testcontainers
```

Läuft auf http://localhost:8080 – Health-Check: http://localhost:8080/api/health
(zeigt auch, ob die Datenbank erreichbar ist).

Beim Start führt **Flyway** automatisch alle neuen Migrationen aus
`backend/src/main/resources/db/migration` aus.

## Roadmap

- [x] 1a – Repository & Struktur
- [x] 1b – Backend-Grundgerüst (Health-Endpoint)
- [x] 1c – PostgreSQL + Flyway
- [ ] 1d – Frontend-Grundgerüst
- [ ] 1e – Alles in Docker Compose
- [ ] 2+ – Fachliche Module (Mitarbeiter, Aufträge, Ersatzwagen, …)
- [ ] Datenmigration aus der alten App
- [ ] Deployment auf das NAS (Version 1)

## Arbeitsweise

- `main` ist immer lauffähig.
- Jede Änderung in einem eigenen Branch, Merge über Pull Request.
- Branch-Namen: `feat/…`, `fix/…`, `chore/…`, `docs/…`
