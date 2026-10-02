# Konventionen

Verbindliche Regeln für Code und Datenbank. Ziel: Jedes Modul sieht gleich aus –
wer eines versteht, versteht alle.

## Sprache

| Was | Sprache | Beispiel |
|---|---|---|
| Fachbegriffe (Klassen, Felder, Tabellen) | **Deutsch** | `Auftrag`, `Mitarbeiter`, `erstelltAm`, `ersatzwagen_buchung` |
| Technische Begriffe | Englisch (wie im Framework) | `AuftragController`, `AuftragService`, `AuftragRepository` |
| Kommentare, Commits, Doku | Deutsch | |
| Testmethoden | Deutsch, beschreibend | `verhindertUeberschreibenMitVeralteterVersion()` |

Umlaute nur in Texten/Kommentaren, nicht in Bezeichnern (`geaendertAm`, nicht `geändertAm`).

## Backend-Struktur: ein Package pro Fachbereich

```
ch.kruegel.werkstatt
├── common/              Gemeinsames (Basisklassen, Konfiguration)
│   ├── config/
│   └── persistence/
├── mitarbeiter/         ← alles zu Mitarbeitern an einem Ort
│   ├── Mitarbeiter.java              Entity
│   ├── MitarbeiterRepository.java    Datenbankzugriff
│   ├── MitarbeiterService.java       Geschäftslogik
│   ├── MitarbeiterController.java    REST-API
│   └── MitarbeiterDto.java …         Ein-/Ausgabe der API
└── auftrag/ …
```

- **Controller**: nur HTTP (Request annehmen, Service aufrufen, Response zurückgeben). Keine Logik.
- **Service**: Geschäftsregeln und Transaktionen (`@Transactional`).
- **Entity**: Daten + Regeln, die nur das Objekt selbst betreffen (z. B. Statuswechsel prüfen).
- **DTOs**: Die API gibt nie Entities direkt heraus, sondern eigene Records.

## Frontend-Struktur

```
frontend/src/
├── main.tsx            Einstieg: Router + TanStack Query
├── app/                App-weit: Router, Layout, Navigation, Fehlerseiten, QueryClient
├── api/                client.ts (typisierter API-Zugriff), schema.d.ts (generiert), fehler.ts
├── lib/                Allgemeine Hilfsfunktionen (z. B. format.ts)
└── features/           ← ein Ordner pro Fachbereich, wie im Backend
    ├── mitarbeiter/
    │   ├── MitarbeiterSeite.tsx     Seite (an eine Route gebunden)
    │   ├── MitarbeiterFormular.tsx  Komponenten
    │   └── mitarbeiterApi.ts        Queries/Mutations für diesen Bereich
    └── …
```

- **Seiten** heissen `…Seite.tsx` und werden in `app/router.tsx` einer URL zugeordnet.
  Neue Seiten zusätzlich in `app/navigation.ts` eintragen.
- **Server-Daten nur über TanStack Query** (`useQuery`/`useMutation`), nie mit eigenem
  `useEffect` + `fetch`. Abfragefunktionen geben `datenOderFehler(await api.GET(…))` zurück.
- **Fehler** aus der API sind immer `ApiFehler` (`api/fehler.ts`) – mit `meldungFuerFeld()`
  für Formulare und `istKonflikt` für 409.
- **Datum/Uhrzeit** nur über `lib/format.ts` anzeigen (`formatDatum`, `formatUhrzeit`,
  `formatZeitpunkt`). Nie `new Date("2026-10-15")` für fachliche Daten.
- **Tests** (Vitest) liegen neben der Datei: `format.ts` → `format.test.ts`.

## Live-Updates

Ändert ein Gerät Daten, laden alle anderen offenen Browser die betroffenen Daten sofort neu.

```
Service speichert ─▶ publishEvent(new DatenGeaendert("mitarbeiter")) ─▶ nach Commit an alle Browser
Browser empfängt { bereich: "mitarbeiter" } ─▶ invalidateQueries(['mitarbeiter']) ─▶ lädt neu
```

- **Backend:** Jeder Service, der Daten ändert, veröffentlicht danach `DatenGeaendert` mit
  seinem Bereich. Verschickt wird automatisch erst nach erfolgreichem Commit.
- **Frontend:** Der **erste Teil jedes Query-Keys ist der Bereich** – genau derselbe Text wie
  im Backend: `['mitarbeiter']`, `['mitarbeiter', id]`. Sonst kommen Änderungen nicht an.
- Bereichsnamen: Kleinbuchstaben, Mehrzahl wie die API-Pfade (`mitarbeiter`, `auftraege`, `todos`).

## UI-Bausteine & Gestaltung

Übersicht aller Bausteine mit Beispielen: http://localhost:5173/system/komponenten

| Baustein | Datei | Verwendung |
|---|---|---|
| Button | `components/ui/Button.tsx` | `variante` primaer/sekundaer/gefahr/ghost, `icon`, `laedt` |
| Eingabefelder | `components/ui/Felder.tsx` | `Textfeld`, `Textbereich`, `Auswahl`, `Checkbox` – immer mit `label`, Fehler über `fehler` |
| Modal | `components/ui/Modal.tsx` | Buttons in `fuss` (bleibt sichtbar), Esc/Hintergrund schliesst |
| Toast | `useToast()` | `toast.erfolg('…')`, `toast.fehler('…')` |
| Bestätigung | `useBestaetigung()` | `if (await bestaetige({ titel, text, gefaehrlich: true })) …` – nie `window.confirm()` |
| Menü | `components/ui/Menue.tsx` | Aufklappmenü, schliesst bei Esc/Klick daneben |

- **Keine fixen Farben/Abstände** im CSS – nur Variablen aus `styles/tokens.css`.
- **CSS pro Komponente** als CSS-Modul (`Button.module.css`) – Klassennamen gelten nur dort.
- **Icons** aus `lucide-react`, mit `aria-hidden`, wenn daneben Text steht.
- **Klickbares mindestens 44 px hoch** (`var(--touch-min)`) – Tablets.
- **Schrift und Icons sind lokal** im Build – die App braucht kein Internet.

## Entitäten

- Erben von `BaseEntity` → automatisch `id` (UUIDv7), `version`, `erstelltAm`, `geaendertAm`.
- Kein öffentlicher Setter für alles: Änderungen über sprechende Methoden
  (`auftrag.statusWechseln(...)` statt `setStatus(...)`).
- Parameterloser Konstruktor nur `protected` (wird nur von JPA gebraucht).

## Datenbank

- Schema **nur über Flyway**: `backend/src/main/resources/db/migration/V<n>__<beschreibung>.sql`.
- Eine gemergte Migration wird **nie** mehr geändert – Korrekturen als neue Migration.
- Tabellen- und Spaltennamen: `snake_case`, Einzahl (`auftrag`, `ersatzwagen_buchung`).
- Pflichtspalten jeder Tabelle (passend zu `BaseEntity`):
  ```sql
  id            uuid         PRIMARY KEY,
  version       bigint       NOT NULL,
  erstellt_am   timestamptz  NOT NULL,
  geaendert_am  timestamptz  NOT NULL
  ```
- Beziehungen immer mit Fremdschlüssel (`REFERENCES …`), Regeln möglichst als Constraint.
- Hibernate erzeugt nie Tabellen (`ddl-auto: validate`).

## API-Fehler

Alle Fehler kommen im Format **Problem Details** (RFC 9457, `application/problem+json`),
erzeugt zentral im `GlobalExceptionHandler`. Kein Controller baut eigene Fehlerantworten.

| Situation | Im Code | HTTP |
|---|---|---|
| Eingabe ungültig | Bean Validation am DTO (`@NotBlank`, `@Size`, …) + `@Valid` | 400 mit Liste `fehler[]` (`feld`, `meldung`) |
| Datensatz fehlt | `throw new NichtGefundenException("Mitarbeiter", id)` | 404 |
| Gleichzeitig bearbeitet | `entity.pruefeVersion(dto.version())` im Service | 409 |
| Alles andere | – (wird automatisch geloggt) | 500, ohne technische Details |

- Validierungsregeln stehen am **DTO**, nicht an der Entity.
- Update-DTOs enthalten immer die `version`, die der Client geladen hat.
- Meldungen sind deutsch (Locale fest auf `de`).

## API-Vertrag (OpenAPI)

Das Backend beschreibt seine API automatisch (springdoc). Diese Beschreibung ist der
Vertrag zwischen Backend und Frontend – daraus entstehen die TypeScript-Typen.

```
Controller/DTOs ──./mvnw test──▶ api/openapi.json ──npm run api:generate──▶ frontend/src/api/schema.d.ts
```

- Nach jeder API-Änderung: `./mvnw test` (Backend) und `npm run api:generate` (Frontend),
  beide Dateien mit committen. Die CI schlägt sonst fehl.
- Das Frontend ruft die API nur über `src/api/client.ts` auf – nie API-Typen von Hand schreiben.
- API im Browser ansehen/ausprobieren: http://localhost:8080/api/docs (Swagger UI).

## Zeit

| Was | Java-Typ | DB-Typ |
|---|---|---|
| Zeitpunkt (wann gespeichert, erledigt am …) | `Instant` | `timestamptz` |
| Fachliches Datum (Termin am 15.10.) | `LocalDate` | `date` |
| Fachliche Uhrzeit (um 08:00) | `LocalTime` | `time` |

- Aktuelle Zeit **immer** über die `Clock`-Bean: `LocalDate.now(clock)`, nie `LocalDate.now()`.
- Zeitzone der Anwendung: `Europe/Zurich` (`TimeConfig.ZEITZONE`).
- JSON: ISO-Format (`2026-10-15`, `08:00:00`, `2026-10-15T06:00:00Z`). Formatierung für
  Menschen (`15.10.2026`) macht ausschliesslich das Frontend.

## Tests

- Gegen echtes PostgreSQL (Testcontainers), nie H2.
- `@DataJpaTest` für Datenbank-Logik, `@SpringBootTest` für die ganze App / API.
- Jeder Test startet mit definiertem Zustand (keine Abhängigkeit von der Reihenfolge).
- Zeitabhängige Tests mit `TestClock`.

## Git

- Ein Paket aus [`roadmap.md`](roadmap.md) = ein Branch = ein Pull Request.
- Branch-Namen: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `ci/…`
- Gemergt wird nur mit grüner CI.
