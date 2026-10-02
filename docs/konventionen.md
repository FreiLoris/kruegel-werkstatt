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
