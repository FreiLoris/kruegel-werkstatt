# Roadmap

Plan für den Neubau in kleinen Paketen. Jedes Paket = ein Branch + ein Pull Request,
`main` bleibt immer lauffähig. Reihenfolge innerhalb einer Phase ist verbindlich,
Phasen bauen aufeinander auf.

Quellen: [`analyse/TIEFENANALYSE_NEUBAU.md`](analyse/TIEFENANALYSE_NEUBAU.md) (Funktionsumfang, Bugs #1–#15),
[`analyse/UI_REVIEW.md`](analyse/UI_REVIEW.md) (Funde F1–F12, UI-Verbesserungen).

**Grundsatz:** Alle Funktionen der alten App bleiben erhalten – alle Bugs nicht.

---

## Übersicht

| Phase | Thema | Ergebnis |
|---|---|---|
| 1 | Grundgerüst ✅ | Repo, Backend, DB, Frontend, Docker Compose |
| 2 | Fundament ✅ | CI, Konventionen, API-Vertrag, UI-Grundbausteine, Live-Updates |
| 3 | Mitarbeiter | Erstes Fachmodul = Vorlage für alle weiteren |
| 4 | Stammdaten | Lifts, Service-Leistungen, Ersatzwagen-Fahrzeuge, Feiertage |
| 5 | Kunden, Fahrzeuge, Import | SwissGarage-Import serverseitig, Kundensuche |
| 6 | Aufträge & Termine | Kern der App: Wizard, Tages-/Wochenansicht, Drag&Drop, Druck |
| 7 | Ersatzwagen-Buchungen | Eine Datenquelle, Doppelbuchung unmöglich |
| 8 | To-dos & Pinnwand | Team-Kommunikation |
| 9 | Abwesenheiten | Mitarbeiterkalender + korrekte Statistik |
| 10 | Dashboard (TV) | Kiosk-Ansicht für den Werkstatt-TV |
| 11 | Migration & Go-Live | Daten übernehmen, Backup, NAS, Umschaltung |

---

## Phase 1 – Grundgerüst ✅

- [x] 1a – Repository & Struktur
- [x] 1b – Backend-Grundgerüst (Health-Endpoint)
- [x] 1c – PostgreSQL + Flyway
- [x] 1d – Frontend-Grundgerüst
- [x] 1e – Alles in Docker Compose

## Phase 2 – Fundament ✅

Querschnitt-Themen, die jedes Fachmodul braucht. Einmal sauber lösen statt in jedem Modul neu.

- [x] **2a – CI mit GitHub Actions**
  Bei jedem PR: Backend-Tests (inkl. Testcontainers), Frontend Lint + Build, Docker-Images bauen.
  PR kann erst gemergt werden, wenn alles grün ist.
- [x] **2b – Backend-Konventionen**
  JPA einführen; Basis für Entitäten (UUID-ID, `erstelltAm`/`geaendertAm`, `@Version` für
  Optimistic Locking); Zeitzone `Europe/Zurich`; JSON-Datumsformat ISO.
- [x] **2c – Fehlerbehandlung & Validierung**
  Einheitliche Fehlerantworten (RFC 9457 *Problem Details*), Bean Validation für Eingaben,
  409 bei gleichzeitiger Bearbeitung (Optimistic Locking). Tests dafür.
- [x] **2d – API-Vertrag**
  OpenAPI-Beschreibung aus dem Backend (springdoc), daraus TypeScript-Typen fürs Frontend
  generieren – keine handgeschriebenen API-Typen.
- [x] **2e – Frontend-Fundament: Routing & Datenabfragen**
  React Router (eine URL pro Seite), TanStack Query (Laden, Caching, Neuladen),
  App-Layout mit Navigation. Formatierung zentral: Datum immer `dd.mm.yyyy` (→ F7).
- [x] **2f – UI-Grundbausteine**
  Design-Tokens (Farben, Abstände, Schrift), Button, Eingabefelder mit Label, Select, Modal
  (Esc schliesst, Sticky-Footer), Toast (nicht hinter anderen Elementen), Bestätigungsdialog.
  Touch-taugliche Grössen (min. 44 px). Schrift + Icons lokal statt CDN (läuft ohne Internet).
  Dropdowns schliessen bei Esc/Klick daneben (→ F9).
- [x] **2g – Live-Updates (SSE)**
  Backend sendet „X hat sich geändert" an alle Geräte, Frontend lädt betroffene Daten neu.
  Ersetzt Socket.IO der alten App. Verbindungsstatus im UI sichtbar.

## Phase 3 – Mitarbeiter

Einfachstes Fachmodul. Hier entsteht das Muster (DB → Entity → Service → API → UI → Tests),
nach dem alle weiteren Module gebaut werden.

- [x] **3a – Datenmodell Mitarbeiter**
  Tabelle + Entity: Name, Rolle (Mechaniker/Büro/Praktikum/Lernender/Geschäftsführung),
  Farbe, Geburtstag, Ferienanspruch, Flags (als Mechaniker wählbar / für To-dos & Notizen /
  eigene Pinnwand-Spalte), aktiv. Testdaten nur im Entwicklungsprofil (→ Bug #9).
- [x] **3b – Mitarbeiter-API**
  CRUD-Endpoints, Validierung, Integrationstests. Löschen = deaktivieren (Historie bleibt).
- [x] **3c – Mitarbeiter-Seite**
  Liste + Formular (Label/Platzhalter stimmig, gut unterscheidbare Farben, Rolle
  Geschäftsführung wählbar). Textfarbe automatisch aus Hintergrund.
- [x] **3d – „Wer bin ich?" pro Gerät**
  Kein Login, aber jedes Gerät wählt einmal eine Person. Wird bei Änderungen mitgespeichert
  („geändert von"). TV-Gerät = „nur ansehen". (→ Bug #11, bewusst ohne Passwort)

## Phase 4 – Stammdaten

- [x] **4a – Lifts konfigurierbar**
  Tabelle statt 3 hartcodierter Lifts; Anzahl/Namen änderbar. (→ Bug #13)
- [ ] **4b – Service-Leistungen konfigurierbar**
  Ölwechsel, Wischblätter, Klimaservice, … als pflegbare Liste statt 8 fixer Checkboxen.
- [ ] **4c – Ersatzwagen-Fahrzeuge**
  Stammdaten (Bezeichnung, Modell, Kennzeichen, Service fällig, Versicherung bis) mit
  Warnung bei fälligem Service. Formular mit Labels. (→ UI-Review Ersatzwagen)
- [ ] **4d – Feiertage Kanton Zürich**
  Serverseitige Berechnung (inkl. Ostern-abhängiger Feiertage) + Endpoint + Tests.

## Phase 5 – Kunden, Fahrzeuge, SwissGarage-Import

- [ ] **5a – ADR 0002: Kunden als Stammdaten oder nur als Import-Kopie?**
  Grundsatzentscheid vor dem Datenmodell (siehe Tiefenanalyse §15 Punkt 2).
- [ ] **5b – Datenmodell Kunde & Fahrzeug**
  Inkl. Firmenkunden (eigenes Feld statt „Nachname"), SwissGarage-Adressnummer als Bezug.
- [ ] **5c – Import Adressliste (serverseitig)**
  Excel-Upload ans Backend, Filter „Garage-Kunde"/nicht gesperrt, Aktualisieren statt
  alles ersetzen, Import-Protokoll (Datum, Anzahl neu/geändert).
- [ ] **5d – Import Fahrzeugliste**
  Fahrzeuge dem Kunden zuordnen, Excel-Datumswerte (MFK) korrekt umrechnen.
- [ ] **5e – Kundensuche-API**
  Suche nach Name, Firma, Kennzeichen; Treffer mit Fahrzeugen.
- [ ] **5f – Import-Seite**
  Upload, Vorschau (lädt zuverlässig → F4), „zuletzt importiert am …", Löschen in Gefahrenzone.

## Phase 6 – Aufträge & Termine

Kern der App, darum feiner aufgeteilt.

- [ ] **6a – Datenmodell Auftrag**
  Bezug Kunde/Fahrzeug/Mechaniker/Lift; Status als Enum (Eingang, In Arbeit, Wartet auf
  Material, Fertig) und **Wartekunde als separates Flag** (→ Bug #4, Status/Flag-Vermischung);
  kommt früher / fertig bis; Radwechsel, MFK, Service-Leistungen, Material inkl. Lieferant;
  Auftragsnummer (extern, optional); Reihenfolge pro Lift/Tag.
- [ ] **6b – Auftrags-API**
  Anlegen, Bearbeiten, Status ändern, Auftragsnummer nachtragen, Löschen (mit „geändert von").
  Optimistic Locking bei gleichzeitiger Bearbeitung.
- [ ] **6c – Wizard Schritt 1: Kunde & Fahrzeug**
  Kundensuche (grössere Trefferliste), Platzhalter klar als Platzhalter, MFK-abgelaufen-Warnung,
  rechts Kundenhistorie statt leerer Fläche.
- [ ] **6d – Wizard Schritt 2: Termin & Arbeiten**
  Sinnvolle Defaults (kommt früher = Vorabend), Kapazitätsübersicht sticky,
  Klick auf Slot übernimmt Datum + Zeit, Buttons nicht abgeschnitten.
- [ ] **6e – Wizard Schritt 3/4 + Auftragszettel**
  Klare „gespeichert"-Bestätigung; Druck mit Briefkopf Krügel, weisses Papier-Layout,
  **alle angekreuzten Arbeiten auf dem Zettel** (→ F1), Kundenadresse.
- [ ] **6f – Termine: Tagesansicht nach Lift**
  Karten mit Mechaniker + Ersatzwagen-Symbol, Drag&Drop zwischen Lifts und innerhalb der
  Spalte – Reihenfolge wird für **alle** betroffenen Aufträge gespeichert (→ Bug #5).
- [ ] **6g – Termine: Wochenansicht**
  Drag&Drop aufs Datum, Abwesenheiten sichtbar, Suche über alle Termine statt nur aktuelle
  Woche (→ F11). Optional: Uhrzeit beim Verschieben übernehmen (→ Bug #6, totes Feature).
- [ ] **6h – Auftrags-Detail**
  Ansicht als lesbarer Text (kein Fake-Formular), Bearbeiten als Formular mit Sticky-Footer,
  Kunden-/Fahrzeugdaten änderbar, Notiz/To-do direkt anlegen, korrektes Label „Mechaniker".
- [ ] **6i – Aufträge-Liste**
  Sortierbare Spalten, Filter (Status, Zeitraum), Arbeiten-Spalte vollständig (→ F1),
  Statusfarben aus **einer** zentralen Definition (→ F10), Löschen nur mit Bestätigung.

## Phase 7 – Ersatzwagen-Buchungen

- [ ] **7a – Datenmodell Buchung**
  Eine Tabelle für alle Buchungen (mit oder ohne Auftrag). Datenbank verhindert
  überlappende Buchungen desselben Fahrzeugs (Exclusion Constraint). (→ Bug #2, F2)
- [ ] **7b – Verfügbarkeit & Buchungs-API**
  Eine einzige Verfügbarkeitsprüfung für Wizard, Auftrag und Ersatzwagen-Seite. Rückgabe erfassen.
- [ ] **7c – Buchung im Auftrag**
  Auswahl im Wizard/Auftrag mit verständlicher Verfügbarkeitstabelle.
- [ ] **7d – Ersatzwagen-Seite**
  Karten mit korrektem Status, Belegungskalender (frei/belegt klar erkennbar),
  Drag-Buchung, Zeitraum im Panel änderbar (→ F12).

## Phase 8 – To-dos & Pinnwand

- [ ] **8a – Datenmodell & API To-do**
  Person als Bezug (statt Name), Deadline, Einkaufsliste-Flag, Bezug zu Auftrag/Notiz
  über ID statt Auftragsnummer-Text (→ Bug #14).
- [ ] **8b – To-do-Seite**
  Personen-Filter aus Mitarbeiterliste (→ Bug #3), aktiver Filter erkennbar,
  eigener Tab Einkaufsliste, Erledigen nur per Checkbox mit „Rückgängig" (→ F5).
- [ ] **8c – Datenmodell & API Notiz**
  Mehrfach-Zuweisung, Bezug zu Auftrag (→ F8), Aufgaben sind ausschliesslich To-dos
  (keine zweite Liste → Bug #10), Archivieren erledigt verknüpfte To-dos, Reaktivieren symmetrisch.
- [ ] **8d – Pinnwand-Seite**
  Spalten aus Mitarbeiterliste (→ Bug #3), gleiche Reihenfolge wie Dashboard, Drag zwischen
  Spalten, Detail-Modal (grosses Textfeld, sichtbares Speichern), Archiv mit Suche.

## Phase 9 – Abwesenheiten & Mitarbeiterkalender

- [ ] **9a – Datenmodell & API Abwesenheit**
  Kategorie als Enum (Ferien, Krank, Fremdarbeit + Firma, Kurs) (→ Bug #1).
- [ ] **9b – Kalender-Seite**
  Durchgehende Balken statt Einzelkästchen, feste Spaltenbreite, 4 unterscheidbare Farben,
  Wochenenden + Feiertage markiert, Drag-Auswahl → Eintrag, lädt immer (→ F3).
- [ ] **9c – Statistik serverseitig**
  Ferientage = Arbeitstage (ohne Wochenende/Feiertage) (→ F6), Saldo pro Person,
  Fremdarbeit pro Firma.

## Phase 10 – Dashboard (TV-Kiosk)

- [ ] **10a – Layout & Wochenraster**
  Mit Tagesköpfen (→ UI-Review Dashboard), Termine + Abwesenheiten pro Tag, Navigation unten.
- [ ] **10b – Heute nach Lift, Mini-Pinnwand, To-dos**
  Leer-Zustand „nächster Termin …", lesbare Spaltennamen, überfällige To-dos mit Datum.
- [ ] **10c – Kiosk-Modus für den TV**
  Grosse Schrift, hoher Kontrast, Uhr + Verbindungsstatus, Datum aktualisiert sich selbst
  (→ Bug #15), keine versehentlichen Aktionen per Touch (→ F5).

## Phase 11 – Migration & Go-Live (Version 1)

- [ ] **11a – Migrationsskript**
  Alte SQLite-Daten (Mitarbeiter, Ersatzwagen, Aufträge, To-dos, Notizen, Abwesenheiten,
  Belegungen) ins neue Schema; Namen → IDs auflösen; Protokoll was nicht zugeordnet werden konnte.
- [ ] **11b – Probelauf & Abgleich**
  Migration auf Kopie, Stichproben gegen alte App.
- [ ] **11c – Backup & Restore**
  Täglicher `pg_dump` in `Datensicherung/`, Aufbewahrung, getestete Wiederherstellung.
- [ ] **11d – Deployment auf das NAS**
  Container Manager, Images (über GitHub Container Registry), `.env` mit eigenem Passwort,
  Speicherlimits prüfen.
- [ ] **11e – Parallelbetrieb & Umschaltung**
  Beide Apps parallel (8080 alt / 8090 neu), finale Migration, alte App abschalten.

---

## Bewusst NICHT übernommen

| Alte App | Grund |
|---|---|
| `GET /api/reset` (löscht alles) | Gefährlich, kein Bedarf (→ Bug #12) |
| Offline-Modus (`file://` + `localStorage`) | Entschieden: nur internes Netz |
| Leere Funktionen `autoSave`/`startPolling`, doppelter Code | Überreste (→ Bug #7, #8) |
| Zwei verschiedene Demo-Datensätze | Ein Testdaten-Set im Entwicklungsprofil (→ Bug #9) |

## Nachverfolgung: Bugs & Funde → Paket

| Fund | Paket | | Fund | Paket |
|---|---|---|---|---|
| Bug #1 Statistik immer 0 | 9a, 9c | | F1 Arbeiten fehlen auf Zettel/Liste | 6e, 6i |
| Bug #2 Ersatzwagen 2 Datenquellen | 7a, 7b | | F2 Ersatzwagen doppelt buchbar | 7a |
| Bug #3 Namen hartcodiert | 8b, 8d | | F3 Kalender leer | 9b |
| Bug #4 Status-Texte uneinheitlich | 6a | | F4 Import-Vorschau leer | 5f |
| Bug #5 Reihenfolge nur teilweise gespeichert | 6f | | F5 To-do per Zeilenklick erledigt | 8b, 10c |
| Bug #6 Toter Drag-Code (Uhrzeit) | 6g | | F6 Ferien zählen Wochenende | 9c |
| Bug #7/#8 Duplikate, leere Funktionen | – | | F7 Datumsformate gemischt | 2e |
| Bug #9 Zwei Demo-Datensätze | 3a | | F8 Notiz-Auftragsbezug fehlt | 8c |
| Bug #10 Notiz-Aufgaben doppelt | 8c | | F9 Dropdown bleibt offen | 2f |
| Bug #11 Keine Nachvollziehbarkeit | 3d | | F10 Statusfarben widersprüchlich | 6i |
| Bug #12 `/api/reset` | – | | F11 Suche nur aktuelle Woche | 6g |
| Bug #13 3 Lifts hartcodiert | 4a | | F12 EW-Zeitraum nicht änderbar | 7d |
| Bug #14 Bezug über Auftragsnummer-Text | 8a | | | |
| Bug #15 Datum aktualisiert nie | 10c | | | |

## Offene Entscheide (werden im jeweiligen Paket geklärt)

| Frage | Wann |
|---|---|
| Kunden als eigene Stammdaten oder nur Import-Kopie? | 5a |
| Format der Auftragsnummer erzwingen oder Freitext? | 6a |
| Uhrzeit beim Verschieben in der Wochenansicht übernehmen? | 6g |
| Später echte Anbindung an SwissGarage/C16 möglich? | nach Version 1 |
