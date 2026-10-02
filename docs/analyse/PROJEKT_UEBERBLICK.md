# Werkstatt-Server — IST-Zustand (Stand 2026-09-25)

Dieses Dokument beschreibt **ausschliesslich den aktuellen technischen Stand** der
selbstgebauten Werkstatt-App im Ordner `werkstatt/`. Keine Bewertung, keine
Empfehlungen — reine Bestandsaufnahme als Grundlage für die Weiterentwicklung.

Kontext: Ein Mitarbeiter von Krügel Fahrzeugtechnik hat mit Claude angefangen,
dieses Tool für den eigenen Betrieb zu bauen. Aktuell enthält die Datenbank nur
**Test-/Fake-Daten** (siehe Abschnitt "Testdaten"), keine echten Kundendaten.

> Für einen geplanten Neubau (Docker Compose: DB + Spring-Boot-Backend + Next.js-Frontend)
> gibt es eine sehr ausführliche Tiefenanalyse mit UML-Diagrammen (Use-Cases, BPMN-Flows,
> Aktivitäts-/Zustandsdiagramme, Klassen-/ER-Modell, Bug-Liste, API-Entwurf):
> [`werkstatt/TIEFENANALYSE_NEUBAU.md`](TIEFENANALYSE_NEUBAU.md).

## 1. Zweck der App

Eine **Termin-/Auftrags-Dispositionstafel** für die Werkstatt: Wer bringt wann
welches Fahrzeug, wer arbeitet dran, auf welcher Hebebühne, welches Material wird
gebraucht, welcher Ersatzwagen ist wo. Ergänzt/dupliziert **nicht** die
Buchhaltung/Fakturierung — offizielle Auftragsnummern und Rechnungen entstehen
weiterhin im separaten Werkstattprogramm (vermutlich C16/"SwissGarage", siehe
`../C16/` und `../garage/`). Die App hat dafür eine manuelle Eingabemaske
("Schritt 3 — Auftragsnummer eintragen"), es gibt **keine automatische
Schnittstelle/API-Anbindung** an C16.

## 2. Tech-Stack

- **Backend:** Node.js, Express 4, `better-sqlite3` (SQLite-Datei `werkstatt.db`),
  `socket.io` 4 für Echtzeit-Sync zwischen mehreren geöffneten Browserfenstern.
  Einziges Backend-File: `server.js` (273 Zeilen).
- **Frontend:** Eine einzige HTML-Datei `garage_v2.html` (~5850 Zeilen) — Vanilla
  JavaScript, kein Framework (kein React/Vue), kein Build-Schritt, kein Bundler.
  Icons via CDN (`tabler-icons`), Excel-Parsing via mitgelieferte `xlsx.full.min.js`
  (lokal, kein CDN), Realtime-Client via mitgelieferte `socket.io.min.js` (lokal).
- **Datenhaltung:** SQLite als reiner Key-Value/JSON-Blob-Store (siehe Abschnitt 4),
  kein relationales Schema, kein ORM, keine Migrationen.
- **Start:** `npm start` → `node server.js` → lauscht fest auf **Port 8080**
  (`server.listen(8080, …)`). `package.json`: `"name": "werkstatt"`,
  `"version": "2.0.0"`, Beschreibung "Krügel Fahrzeugtechnik – Werkstatt-Server".
- **Zugriff:** `http://<server-ip-oder-hostname>:8080/` liefert `garage_v2.html`
  aus (`express.static`); mehrere Clients (PCs/Tablets im Netz) können gleichzeitig
  verbinden.
- **Offline-Fallback:** Wird die HTML-Datei lokal per `file://` geöffnet (statt über
  den Server), erkennt das Skript das (`location.protocol !== 'file:'`) und
  arbeitet rein mit `localStorage` weiter, ohne Server/Sync.

## 3. Architektur / Datenfluss

- Beim Laden holt der Client per `GET /api/daten` einmalig den ganzen Datenbestand
  (`ladeAlle()` im Server liest alle Tabellen und baut ein JSON-Objekt).
- Danach verbindet sich der Client per Socket.IO (`transports: ['polling']`, kein
  WebSocket-Upgrade konfiguriert) zum selben Host auf Port 8080.
- **Jede Änderung** (Auftrag anlegen/bearbeiten/löschen, To-do, Notiz, Mitarbeiter-
  Event, Ersatzwagen-Belegung) wird per Socket-Event `speichern` an den Server
  geschickt → Server schreibt in SQLite (`INSERT OR REPLACE`) → Server sendet
  `update`-Broadcast an **alle anderen** verbundenen Clients, die ihren lokalen
  State (`S`-Objekt) patchen und neu rendern. Es gibt keinen Konfliktschutz
  (Last-Write-Wins, kein Locking, keine Versionierung).
- Zusätzlich gibt es `bulk_speichern` (Massenspeicherung mehrerer Listen auf
  einmal, triggert bei allen Clients ein komplettes `reload`).
- Jeder Client führt bei jedem Speichern **zusätzlich** ein lokales
  `localStorage.setItem('werkstatt_backup', …)` durch (Client-seitiges Backup,
  unabhängig vom Server).
- REST-Endpunkte des Servers:
  - `GET /api/daten` — kompletter Datenexport als JSON
  - `GET /api/status` — Anzahl Aufträge/Todos/Notizen
  - `GET /api/reset` — **löscht alle Tabellen** (Aufträge, Todos, Notizen,
    Mitarbeiter-Events, Ersatzwagen-Belegungen, alle Einstellungen). Ungeschützter
    GET-Request ohne Bestätigung/Auth.

## 4. Datenmodell (SQLite-Tabellen)

Alle Tabellen ausser `einstellungen` haben dasselbe simple Schema:
`id TEXT PRIMARY KEY, daten TEXT NOT NULL (JSON), geaendert TEXT NOT NULL (ISO-Datum)`.

| Tabelle | Inhalt (JSON-Objekt pro Zeile) |
|---|---|
| `auftraege` | Ein Termin/Auftrag: Kunde (Name/Tel/Mobil/Adresse), Fahrzeug (Marke/KZ/Jahrgang/KM/Farbe/MFK), Termin (Datum/Uhrzeit), Mechaniker, Lift (1–3), Status (`Eingang`/`In Arbeit`/`Wartet auf Material`/`Wartekunde`/`Fertig`), diverse Bool-Flags + Unterfelder: Radwechsel, MFK, Service (Mehrfachauswahl aus 8 festen Leistungen), Material/Bestellstatus/Lieferant, Ersatzwagen-Zuordnung + Abhol-/Rückgabezeit, freie Felder "Arbeiten" und "Notizen", offizielle `aufnr` (manuell eingetragen). |
| `todos` | Aufgabe: Text, zuständige Person (Freitext, meist Mitarbeitername), erledigt (bool), Deadline, `einkauf`-Flag (kennzeichnet Einkaufsliste-Einträge), erledigt-Zeitstempel. |
| `notizen` | Pinnwand-Notiz: Verfasser, Zuweisung (Liste von Personen), Text, Datum/Zeit, optionaler Bezug zu Auftrag/Auftragsnummer, Unteraufgaben-Liste (`aufgaben`), Archiv-Flag. |
| `mitarbeiter_events` | Kalendereintrag pro Mitarbeiter: Kategorie (`Ferien`/`Krank`/`Fremdarbeit`/`Kurs`/`Geburtstag`), Von/Bis-Datum, Titel, Firma (bei Fremdarbeit), Archiv-Flag. |
| `ersatzwagen_belegungen` | Buchung eines Ersatzwagens: welches Fahrzeug, Kunde/Auftragsnummer, Von/Bis-Datum, Rückgabe-Status. |
| `einstellungen` | Key-Value-Ablage für alles andere: `mitarbeiter` (Liste der Mitarbeitenden inkl. Farbe, Rolle, Geburtstag, Ferienanspruch, Berechtigungs-Flags), `ersatzwagen` (Stammdaten der Poolfahrzeuge), `sg_kunden` / `sg_fahrzeuge_1` / `sg_fahrzeuge_2` (importierte SwissGarage-Kundendatenbank, siehe Abschnitt 6). |

Es gibt **keine** Tabelle für Rechnungen, Preise, Ersatzteile/Lagerbestand oder
Benutzerkonten.

## 5. Seiten / Funktionsbereiche (Navigation oben)

1. **Dashboard** (`nav('dashboard')`) — Startseite: Wochenübersicht oben, darunter
   3-spaltige Tagesansicht nach Lift (Lift 1/2/3, **fest codiert**, nicht
   konfigurierbar über die UI), Pinnwand-Spalten in der Mitte, offene To-dos rechts.
2. **➕ Neuer Termin** (`nav('neu')`) — 4-Schritte-Wizard:
   - Schritt 1: Kundendaten (mit Live-Suche in importierter SwissGarage-DB) +
     Fahrzeugdaten.
   - Schritt 2: Datum/Uhrzeit, Flags "kommt früher"/"fertig bis"/"Wartekunde",
     Mechaniker + Lift-Zuweisung, Arbeiten-Checkboxen (Radwechsel, MFK, Service
     mit 8 Unterpunkten, Material bestellen mit Status/Lieferant), freie
     Arbeiten-/Notizfelder, Ersatzwagen-Auswahl mit Verfügbarkeitsanzeige
     (±2 Tage), daneben eine 2-Wochen-Kapazitätsansicht (Zeitraster 07:00–17:30,
     30-Min-Slots) aller bereits erfassten Termine.
   - Schritt 3: Der Auftrag ist zu diesem Zeitpunkt **bereits in der DB
     gespeichert**; hier wird nur die im externen Werkstattprogramm vergebene
     offizielle Auftragsnummer nachträglich eingetragen.
   - Schritt 4: Zusammenfassung + Druckansicht eines Auftragszettels
     (`window.print()`, kein PDF-Export, kein Speichern als Datei).
3. **Termine** — Tages- oder Wochenansicht aller Termine, Legende nach Status-
   Farbe, Volltextsuche.
4. **Aufträge** — Tabellarische Liste aller Aufträge, Suche + Status-Filter.
5. **To-dos** — Liste offener/erledigter Aufgaben, Filter nach Person (5 fest
   hinterlegte Namen als Schnellfilter-Buttons: Reto/Erich/Döme/Mora/Noser —
   das sind aber nur die **Seed-Testdaten**, echte Mitarbeitende werden über die
   Mitarbeiter-Seite verwaltet), `Einkaufsliste`-Kennzeichnung einzelner To-dos.
6. **📌 Pinnwand** — Kanban-artiges Notizboard nach Mitarbeiter-Spalten, Notizen
   mit Unteraufgaben, Bezug zu Auftragsnummern, Archivfunktion.
7. **🚗 Ersatzwagen** (über Einstellungen-Menü erreichbar) — Kartenübersicht der
   Poolfahrzeuge (Kennzeichen, Modell, Service fällig, Versicherung bis),
   Belegungskalender, manuelle Zuweisung an Kunde/Auftrag, Verwaltung
   (Fahrzeuge hinzufügen/bearbeiten).
8. **👤 Mitarbeiter** (über Einstellungen-Menü erreichbar) — drei Unteransichten:
   - *Kalender*: Monatsansicht mit Abwesenheiten/Terminen pro Mitarbeiter,
     inkl. Schweizer Feiertage Kanton ZH (`feiertageZH()`, offenbar
     algorithmisch berechnet inkl. beweglicher Feiertage).
   - *Liste*: Stammdaten der Mitarbeitenden.
   - *Statistik*: Jahresauswertung (vermutlich Ferientage-Saldo je nach
     Ferienanspruch, nicht im Detail geprüft).
   - Mitarbeiter anlegen mit: Name, Rolle (Mechaniker/Büro/Praktikum/Lernender),
     Geburtstag, Ferienanspruch (Tage/Jahr), Pinnwand-Farbe, sowie drei
     granularen Berechtigungs-Flags (als Mechaniker für Termine wählbar / als
     Person für Notizen&To-dos wählbar / eigene Pinnwand-Spalte). Diese Flags
     steuern nur, wo die Person in Dropdowns/Spalten auftaucht — **kein
     Login-System, keine Zugriffsbeschränkung** dahinter.
9. **⬆ SwissGarage Import** (über Einstellungen-Menü erreichbar) — siehe Abschnitt 6.

## 6. SwissGarage-Import (externe Datenquelle)

Die App kann zwei Excel-Exporte aus der bestehenden Werkstattsoftware
("SwissGarage", Dateipräfix `c16.*` im Ordner `../C16/`) per Drag&Drop oder
Dateiauswahl importieren:

- **Adrliste.xlsx** (Export: SwissGarage → Adressen → Export → Excel) — wird
  gefiltert auf Adressart `"Garage-Kunde"` (ohne `"gesperrt"`), Felder: Anrede,
  Name, Vorname, Zusatz, Strasse, PLZ, Ort, Tel.1, Handy, E-Mail, Adressnummer.
- **Fahrzeug.xlsx** (Export: SwissGarage → Fahrzeuge → Export → Excel) — Felder:
  Int.Nr., Kennz., Marke, Typ, Kar-Form, Chassis-Nr., Motor-Nr., Treibstoff, ccm,
  Km aktuell, Jahrg., MFK, Farbe, Klima, plus Halterdaten (Name, Vorname,
  Telefon, Handy, Adresse, Bemerkung).

Import ist **einseitig** (nur Lesen aus Excel, kein Export/Rückschreiben nach
SwissGarage/C16) und überschreibt den kompletten importierten Bestand bei jedem
Upload (`DB.kunden = rows...`, kein Merge/Diff). Die importierten Daten werden
sowohl in der SQLite-DB (`einstellungen.sg_kunden` / `sg_fahrzeuge_*`) als auch
redundant im `localStorage` jedes Clients gehalten und dienen ausschliesslich der
Kundensuche/Autofill in Schritt 1 des Termin-Wizards.

## 7. Testdaten (Seed)

`server.js` (`seedTestdaten()`) befüllt eine **leere** Datenbank automatisch mit
Demodaten, sobald `auftraege` leer ist: 5 fiktive Mitarbeitende (Reto, Erich,
Döme, Mora, Noser), 3 fiktive Ersatzwagen, 8 fiktive SwissGarage-Kunden
(Winterthur-Adressen) mit Fahrzeugen, 7 Beispiel-Aufträge, 7 To-dos, 5
Pinnwand-Notizen, 3 Mitarbeiter-Events, 1 Ersatzwagen-Belegung. Alle Namen/Daten
sind erfunden, keine echten Personen oder Fahrzeuge von Krügel Fahrzeugtechnik.

## 8. Beobachtete technische Eigenheiten (rein deskriptiv)

- Keine Authentifizierung/Login irgendwo in Server oder Client (kein `passwort`/
  `login`/`auth` im Code gefunden). Jeder mit Netzwerkzugriff auf Port 8080 kann
  lesen und schreiben.
- `Server({ cors: { origin: '*' } })` — Socket.IO nimmt Verbindungen von jedem
  Origin an.
- `GET /api/reset` löscht ohne Rückfrage die komplette Datenbank.
- Lift-Anzahl (3) ist an mehreren Stellen im HTML/JS hart codiert (Dropdown-
  Optionen, Dashboard-Spalten, Farblegenden), nicht über die UI konfigurierbar.
- Es existiert ein alter Python-Prototyp derselben App unter `../werkstattalt/`
  (`server.py`, eigene `werkstatt.db`) — separater Datenbestand, offenbar nicht
  mehr aktiv gepflegt (Log-Dateien dort seit Mai leer).
- Ob `werkstatt.db` durch die vorhandenen automatisierten Backup-Jobs
  (`../Datensicherung/Garage*.7z`) mitgesichert wird, wurde nicht geprüft — die
  Namensgebung dieser Backups deutet eher auf den C16/SwissGarage-Ordner
  `../garage/` hin, nicht auf diesen Node-Ordner.
- Keine automatisierten Tests, kein Linter/Formatter-Setup, kein `.git`
  (kein Versionskontroll-Repo im Ordner gefunden).
