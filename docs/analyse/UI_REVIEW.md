# UI-Review Werkstatt-App (Stand 2026-10-02)

Durchgeklickt: alle Seiten, Modals, Dropdowns, Formulare, Drag&Drop (Chrome, 1308×924).
Screenshots: `screenshots/` (Nummer im Dateinamen = Verweis unten, z.B. `[36]`).
Kontext: **Dashboard läuft in der Firma auf einem grossen TV** → dort zählt Lesbarkeit aus Distanz.

Priorität: 🔴 = Fehler/irreführend · 🟠 = stört im Alltag · 🟢 = Feinschliff

---

## 0. Funktionale Fehler, die beim Klicken aufgefallen sind

| # | Prio | Fund | Screenshot |
|---|---|---|---|
| F1 | 🔴 | **Auftragszettel zeigt "Arbeiten: —"** obwohl Radwechsel, MFK, Service (Öl, Bremsen), Material angekreuzt. Gedruckt wird nur das Freitextfeld → Mechaniker bekommt Zettel ohne Arbeiten. Gleiches in der Aufträge-Tabelle (Spalte "Arbeiten" leer). | [37], [51] |
| F2 | 🔴 | **Ersatzwagen doppelt buchbar**: VW Polo im Auftrag für heute gebucht, Ersatzwagen-Seite zeigt "Frei" + leeren Kalender. (= Bug #2 aus Tiefenanalyse) | [69] |
| F3 | 🔴 | **Mitarbeiter-Kalender leer**, wenn man über die Navigation kommt. Erst Klick auf "Heute" rendert ihn. | [60] |
| F4 | 🔴 | **Import-Vorschau leer**, obwohl "1817 Kunden · 3069 Fahrzeuge geladen". Gleiches Muster wie F3 (Render beim Seitenwechsel fehlt). | [73] |
| F5 | 🔴 | **To-do auf Dashboard: Klick irgendwo auf die Zeile = sofort erledigt**, ohne Rückfrage/Undo. Auf einem TV/Touch passiert das versehentlich. | [23] |
| F6 | 🟠 | Statistik zeigt 0 Ferientage trotz erfasster Ferien (= Bug #1). Ausserdem zählen Ferien über Sa/So mit (Kalender zeigt Ferien-Kästchen am Wochenende). | [62], [63] |
| F7 | 🟠 | Notiz-Datum im US-Format `5/28/2026`, Rest der App `28.05.2026`. Ersatzwagen-Daten im ISO-Format `2026-08-15`. | [59], [69] |
| F8 | 🟠 | Notiz mit Auftragsbezug (Badge "A-2026-423") zeigt im Modal "— kein Auftrag —". | [24], [59] |
| F9 | 🟠 | Einstellungen-Dropdown im Header bleibt offen (Escape/Seitenwechsel schliessen es nicht). | [27]–[39] |
| F10 | 🟠 | Statusfarben widersprüchlich: Legende "In Arbeit" = blau, in Aufträge-Tabelle orange; "Eingang" Legende dunkelgrau, Tabelle blau. "Wartet auf Material" (Seed) bekommt keine Farbe. | [39], [51] |
| F11 | 🟢 | Termin-Suche durchsucht nur die angezeigte Woche/Tag – kein Hinweis "3 Treffer in anderen Wochen". | [50] |
| F12 | 🟢 | Ersatzwagen-Zuweisen-Panel: Zeitraum fix "heute", nicht änderbar (nur via Kalender-Drag). | [70] |

---

## 1. Dashboard (TV-Ansicht)

| Prio | Problem | Vorschlag |
|---|---|---|
| 🔴 | **Wochenraster hat keine Tagesköpfe** – man sieht nicht, welche Spalte welcher Tag ist (nur heute ist leicht eingefärbt). | Kopfzeile "Mo 28.9." usw. wie in Termine-Wochenansicht, gross. |
| 🔴 | **Pinnwand-Spaltennamen unlesbar** (farbiger Text auf gleichfarbigem Hintergrund, z.B. "Reto" gelb auf gelb). | Name weiss/dunkel auf Farbbalken, oder Avatar-Kreis wie auf Pinnwand-Seite. [18] |
| 🔴 | Gesamtkontrast zu tief für TV: "Frei" in Lift-Spalten, Spaltenlinien, Datum kaum sichtbar. | Für TV eigenen "Kiosk-Modus": grössere Schrift (≥ 18–20px), höherer Kontrast, keine grauen 40%-Texte. [20] |
| 🟠 | Kein Hinweis auf Verbindungsstatus/Uhrzeit (Header ausgeblendet). Auf TV merkt niemand, wenn Sync weg ist. | Kleine Uhr + Status-Punkt oben rechts im Wochen-Header. Uhrzeit live (Datum aktualisiert sich heute nie, Bug #15). |
| 🟠 | Wochenraster belegt 28 % Höhe, ist aber meist leer (nur Abwesenheiten). | Termine pro Tag als kompakte Chips hinein, oder Höhe dynamisch. |
| 🟠 | Lift-Spalten zeigen nur heute; wenn leer → riesige schwarze Fläche. | Leer-Zustand "Keine Termine heute – nächster: Mo 5.10. 08:00 Müller". |
| 🟠 | Spaltenreihenfolge Pinnwand anders als auf Pinnwand-Seite (Dashboard: Reto, Erich, Döme, Mora, Noser – Seite: Reto, Erich, Noser, Döme, Mora). | Eine Reihenfolge (aus Mitarbeiter-Stammdaten). |
| 🟢 | Schwarzer Streifen unter der unteren Nav-Leiste (Layout-Höhe rechnet noch mit Header). | `height:100vh` statt `calc(100vh - 60px)` auf Dashboard. [17] |
| 🟢 | To-dos: überfällige nur mit ⚠-Icon, Datum fehlt. | "seit 28.05." anzeigen. |
| 🟢 | Untere Nav: "Mitarbeiter" fehlt (nur im Dropdown). Okay für TV, aber inkonsistent zum Header. | – |

## 2. Navigation & global

| Prio | Problem | Vorschlag |
|---|---|---|
| 🟠 | "Mitarbeiter" doppelt (Header + Einstellungen-Dropdown). Ersatzwagen nur im Dropdown, obwohl Tagesgeschäft. | Ersatzwagen in Hauptnav, Mitarbeiter-Duplikat raus. |
| 🟠 | Toasts erscheinen unten rechts **hinter/unter dem schwebenden "Dashboard"-Button**. | Toast oben rechts oder über dem Button. [30], [44] |
| 🟠 | Escape schliesst Modals nicht überall (Notiz-Modal ja/nein je nach Stelle). | Einheitlich: Esc + Klick ausserhalb schliesst, ausser bei ungespeicherten Änderungen. |
| 🟢 | Icons uneinheitlich (Emoji 📌 👤 ➕ neben reinen Text-Einträgen). | Durchgehend Tabler-Icons (sind schon geladen). |
| 🟢 | "‹ ›"-Pfeile zum Blättern sehr klein (≈ 16px) – auf Tablet kaum treffbar. | Min. 36–44px Touch-Fläche. |

## 3. Neuer Termin (Wizard)

| Prio | Problem | Vorschlag |
|---|---|---|
| 🔴 | Platzhalter sehen aus wie echte Werte ("ZH 123456", "2019", "85000", "Schwarz") – nach Kundenwahl unklar, was ausgefüllt ist. | Platzhalter heller/kursiv oder "z.B. …" davor. [30] |
| 🟠 | Schritt 1 nutzt nur ~40 % der Breite, rechts leer. | Rechts: letzte Aufträge dieses Kunden / Fahrzeug-Infos (MFK fällig etc.). |
| 🟠 | Suchergebnis-Liste nur 3 Zeilen hoch (scrollt). | 6–8 Zeilen. [27] |
| 🟠 | Firmenkunde landet im Feld "Nachname" ("Krügel Fahrzeugtechnik"). | Feld "Firma" oder Label "Name / Firma". |
| 🟠 | MFK "März 2012" (längst abgelaufen) ohne Warnung. | Rot markieren "MFK abgelaufen". |
| 🟠 | Schritt 2: Button "Speichern & Auftragsnummer" **abgeschnitten**. | Button-Text kürzen ("Speichern →") oder umbrechen. [31] |
| 🟠 | Schritt 2: linke Spalte wird mit allen Optionen sehr lang, Kapazitätsübersicht rechts scrollt weg. | Kapazität `position: sticky`; oder Optionen in 2 Spalten. [32], [33] |
| 🟠 | Kapazitätsübersicht: Spaltenköpfe ungleich hoch (KW-Label), "0T" unklar, Klick in Slot setzt kein Datum/Uhrzeit. | Einheitliche Köpfe, "0 Termine", Klick auf Slot → Datum+Zeit übernehmen. |
| 🟠 | Material bestellen: kein Lieferant-Feld (im Seed vorhanden). | Feld ergänzen. |
| 🟢 | "Kommt früher" default = gleicher Tag 07:00 – meist ist Vorabend gemeint. | Default: Vortag 17:00. |
| 🟢 | Ersatzwagen-Verfügbarkeit: Spalten zu schmal, Datum bricht 3-zeilig um. | Kurzformat "Mi 30.9." in einer Zeile. |
| 🟢 | Schritt 3: kein klares "✓ gespeichert" – Nutzer weiss nicht, dass Auftrag schon existiert. | Grüne Bestätigung "Termin gespeichert" oben. [35] |
| 🟠 | Schritt 4 Auftragszettel: Titel "AUTOGARAGE", kein Logo/Adresse Krügel; Vorschau dunkel statt Papier-weiss; Adresse des Kunden fehlt. | Briefkopf Krügel, weisser Zettel, Kundenadresse + Arbeiten-Checkliste (F1). [36] |

## 4. Termine

| Prio | Problem | Vorschlag |
|---|---|---|
| 🟠 | Karte zeigt keinen Mechaniker und keinen Ersatzwagen; Arbeiten-Zeile sehr kontrastarm. | Mechaniker-Badge (Farbe) + 🚗-Icon bei EW. [40] |
| 🟠 | Wochenansicht: Abwesenheiten fehlen (Dashboard zeigt sie). Montags-Kopf durch KW-Label höher → Raster versetzt. | Abwesenheits-Chips + KW separat links. [49] |
| 🟢 | Legende: "Eingang" (dunkelgrau) kaum sichtbar. | Hellere Farbe. |
| 🟢 | Leerer Tag: grosse leere Fläche. | "Nächster Termin: …" anzeigen. |

## 5. Termin-Modal (Ansicht / Bearbeiten)

| Prio | Problem | Vorschlag |
|---|---|---|
| 🔴 | Ansichtsmodus sieht aus wie Formular (Inputs, Checkboxen), ist aber read-only → Nutzer klicken rein und nichts passiert. | Ansicht als Text/Liste darstellen, Bearbeiten-Modus als Formular. [41] |
| 🟠 | Label "Termin erstellt von: Reto" – ist aber der Mechaniker. | "Mechaniker". |
| 🟠 | Kunden-/Fahrzeugdaten im Bearbeiten-Modus **nicht änderbar** (Name, Tel., KZ). | Editierbar machen. [44] |
| 🟠 | Speichern/Abbrechen/Löschen nur ganz unten (scrollen nötig). | Sticky Footer. [45] |
| 🟠 | "Notiz"/"To-do"-Buttons oben scrollen nur nach unten zu kleinen "+ Neu"-Links, dann öffnet Modal-im-Modal. | Direkt Formular öffnen. [47], [48] |
| 🟢 | Weisser Browser-Scrollbalken im dunklen Modal. | Dunkler Scrollbar-Style. |

## 6. Aufträge-Liste

| Prio | Problem | Vorschlag |
|---|---|---|
| 🟠 | Löschen-"✕" in jeder Zeile immer sichtbar – Fehlklick-Gefahr. | Nur im Modal oder bei Hover, mit Bestätigung. |
| 🟠 | Keine Spalten-Sortierung, kein Datumsfilter, Sortierung nach Erstellung statt Termin. | Klickbare Spaltenköpfe, Filter "diese Woche / offen". |
| 🟢 | Fehlende Auftragsnr. mal "—", mal "(noch keine)". | Einheitlich "– offen –" in Orange. |

## 7. To-dos

| Prio | Problem | Vorschlag |
|---|---|---|
| 🟠 | Aktiver Filter-Button kaum erkennbar; "Alle" nie markiert. | Gefüllter Button für aktiven Filter. [53] |
| 🟠 | Personen-Filter fest Reto/Erich/Döme/Mora/Noser (Bug #3). | Aus Mitarbeiterliste. |
| 🟢 | Kein Filter/Ansicht "Einkaufsliste", obwohl es das Flag gibt. | Tab "🛒 Einkaufsliste". |
| 🟢 | To-do ohne Person/Deadline zeigt gar keine Meta-Zeile ("sddeee"). | "nicht zugewiesen" anzeigen. |

## 8. Pinnwand

| Prio | Problem | Vorschlag |
|---|---|---|
| 🟠 | Karte zeigt Spaltennamen nochmal als Kopf ("NOSER" in Spalte Noser), Autor nur klein kursiv. Farbe der Karte = Autor? unklar. | Kopf = Autor, Farbe erklären oder Farbe = Zuständiger. [57] |
| 🟠 | Bearbeiten-Textfeld nur 2 Zeilen hoch. | Auto-Höhe. [59] |
| 🟢 | "Infos"-Feld ohne Speichern-Button (speichert implizit?). | Sichtbares "gespeichert ✓". |
| 🟢 | Archiv ohne Suche/Datumsgruppen. | Bei vielen Notizen nötig. [58] |

## 9. Mitarbeiter

| Prio | Problem | Vorschlag |
|---|---|---|
| 🔴 | Abwesenheiten als einzelne Mini-Kästchen pro Tag, Spaltenbreite springt je nach Label ("Fremd", "Ferie" abgeschnitten). | Durchgehender Balken über den Zeitraum, feste Spaltenbreite. [63] |
| 🔴 | Legende: Ferien, Krank, Fremdarbeit, Kurs alle **gleiche Braun-Farbe**. | 4 klar unterscheidbare Farben. [61] |
| 🟠 | Wochenenden nicht abgesetzt. | Sa/So grau hinterlegen. |
| 🟠 | Jahr-Dropdown über halbe Seitenbreite gestreckt; Tabs/Buttons rechts oben gequetscht. | Kompakte Toolbar. |
| 🟢 | "Mitarbeiter erfassen": Label "Name", Platzhalter "Vorname"; Rolle "Geschäftsführer" fehlt; Farb-Swatches teils fast gleich (2× grün, 2× blau). | Fixen. [67] |
| ✅ | Drag-Auswahl im Kalender → Modal mit Zeitraum funktioniert gut. | [68] |

## 10. Ersatzwagen

| Prio | Problem | Vorschlag |
|---|---|---|
| 🔴 | Status "Frei" falsch (F2). | Eine Datenquelle. |
| 🟠 | Freie Kalenderzellen fast unsichtbar (winzige Punkte). | Klar "frei" grün / "belegt" mit Kundenname. |
| 🟠 | "Fahrzeug hinzufügen"-Formular: nur Platzhalter, keine Labels; anderer Modal-Stil als Rest. | Labels wie in anderen Modals. [72] |
| 🟢 | Service-fällig-Warnung rot ⚠ gut – aber Datum ISO. | `15.08.2026`. |

## 11. SwissGarage Import

| Prio | Problem | Vorschlag |
|---|---|---|
| 🔴 | Vorschau-Tabelle leer (F4). | – |
| 🟠 | Kein "zuletzt importiert am …" – man weiss nicht, wie aktuell die Kundendaten sind. | Datum + Dateiname anzeigen. |
| 🟠 | "🗑 Datenbank löschen" direkt neben Suche, rot. | Weiter weg / in "Gefahrenzone". |

---

## Top 10 – Reihenfolge zum Umsetzen

1. F1 Auftragszettel + Aufträge-Tabelle: angekreuzte Arbeiten anzeigen
2. Dashboard TV: Tagesköpfe im Wochenraster + Kontrast/Schriftgrösse (Kiosk-Modus)
3. Dashboard: To-do nicht per Zeilenklick erledigen (nur Checkbox, mit Undo-Toast)
4. F3/F4: Kalender + Import-Vorschau beim Seitenwechsel rendern
5. F2: Ersatzwagen eine Datenquelle
6. Mitarbeiter-Kalender: Balken statt Kästchen, 4 Kategorie-Farben
7. Termin-Modal: Ansicht als Text statt Fake-Formular, Sticky-Footer, Kunde editierbar
8. Einheitliches Datumsformat `dd.mm.yyyy` überall
9. Status-Farben überall gleich (eine zentrale Map)
10. Wizard: Platzhalter klar als Platzhalter, Button-Overflow, Kapazität sticky
