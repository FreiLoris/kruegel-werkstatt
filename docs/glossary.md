# Glossary – German ↔ English

The app speaks **German** to its users (every UI text, every user-facing error message).
The code speaks **English** (identifiers, database, API, comments, docs, commits).
This table is the single source for translating domain terms – use exactly these words.

If a term is missing: add it here in the same pull request that introduces it.

## Domain

| German (UI) | English (code) | Notes |
|---|---|---|
| Mitarbeiter, Mitarbeiterin | `Employee` / `employees` | |
| Rolle | `Role` | enum |
| ↳ Geschäftsführung | `MANAGEMENT` | |
| ↳ Mechaniker | `MECHANIC` | |
| ↳ Büro | `OFFICE` | |
| ↳ Lernender (Lehrling) | `APPRENTICE` | |
| ↳ Praktikum | `INTERN` | |
| Farbe (einer Person) | `color` | `#rrggbb` |
| Geburtstag | `birthday` | `LocalDate` |
| Ferienanspruch | `vacationDaysPerYear` | |
| als Mechaniker wählbar | `selectableAsMechanic` | |
| für To-dos & Notizen wählbar | `selectableForTodos` | not "Tasks" – `Task` is the job/appointment |
| eigene Pinnwand-Spalte | `hasPinboardColumn` | |
| aktiv / deaktivieren / aktivieren | `active` / `deactivate` / `activate` | never delete master data |
| Reihenfolge | `sortOrder` (field), `reorder` (action) | |
| Stammdaten | master data | |
| Lift (Hebebühne) | `Lift` / `lifts` | |
| Serviceleistung | `ServiceItem` / `service-items` | Ölwechsel, Wischblätter, … |
| Wer bin ich? / Person des Geräts | device person, `CurrentPerson` | header `X-Person` |
| nur ansehen | view-only | |
| geändert von / am | `updatedBy` / `updatedAt` | |
| erstellt von / am | `createdBy` / `createdAt` | |

### Coming in later phases

| German (UI) | English (code) | Notes |
|---|---|---|
| Auftrag / Termin | `Task` | one entity for both, like in the old app |
| Auftragsnummer | `taskNumber` | external, optional |
| Status Eingang / In Arbeit / Wartet auf Material / Fertig | `RECEIVED` / `IN_PROGRESS` / `WAITING_FOR_PARTS` / `DONE` | |
| Wartekunde | `waitingCustomer` | flag: customer waits on site |
| Kunde | `Customer` | |
| Fahrzeug | `Vehicle` | |
| Kennzeichen | `licensePlate` | |
| Jahrgang | `modelYear` | |
| Kilometerstand | `mileageKm` | |
| MFK (Motorfahrzeugkontrolle) | `mfk` | Swiss periodic vehicle inspection – kept as a proper noun, a literal translation would be ambiguous |
| Radwechsel | `tireChange` | |
| Material / Bestellung | `parts` / `partsOrder` | |
| Lieferant | `supplier` | |
| Ersatzwagen | `CourtesyCar` | the loan car given to customers |
| Ersatzwagen-Buchung | `CourtesyCarBooking` | |
| ↳ Bezeichnung (des Ersatzwagens) | `name` | e.g. "Ersatzwagen 1" |
| ↳ Modell | `model` | e.g. "VW Polo" |
| ↳ Service fällig | `serviceDue` | |
| ↳ Versicherung bis | `insuranceUntil` | |
| ↳ bald fällig / überfällig (abgelaufen) | `DUE_SOON` / `OVERDUE` (`DueStatus`) | "soon" = within 30 days |
| ausser Betrieb nehmen | `deactivate` | |
| Pinnwand | `Pinboard` | |
| Notiz | `Note` | |
| To-do | `Todo` | |
| Einkaufsliste | `shoppingList` | |
| Abwesenheit (Ferien, Krank, Kurs, Fremdarbeit) | `Absence` (`VACATION`, `SICK`, `TRAINING`, `EXTERNAL_WORK`) | |
| Feiertag | `PublicHoliday` | canton Zurich, computed (`ZurichPublicHolidays`) – names stay German |
| Arbeitstag | working day (`isWorkingDay`) | Monday–Friday without public holidays |
| Ostersonntag | `EasterSunday` | basis for the moving holidays |
| Auftragszettel | task sheet | printed sheet for the mechanic |
| SwissGarage-Import | SwissGarage import | product name stays |

## Technical (common)

| German (old code) | English |
|---|---|
| `DatenGeaendert(bereich)` | `DataChanged(topic)` – topics: `employees`, `lifts`, `service-items` |
| `EingabeFehlerException(feld, meldung)` | `InvalidInputException(field, message)` |
| `NichtGefundenException` | `NotFoundException` |
| `VeralteteVersionException`, `pruefeVersion` | `StaleVersionException`, `checkVersion` |
| `RegelVerletztException` | `BusinessRuleException` |
| `KeinePersonException` | `NoPersonSelectedException` |
| `AktuellePerson`, `PersonVerzeichnis` | `CurrentPerson`, `PersonDirectory` |
| `Sortierbar`, `Reihenfolge.neuSetzen` | `Sortable`, `SortOrder.reorder` |
| `…Eingabe` (request DTO) | `…Request` |
| `…Dto` | `…Dto` (unchanged) |
| Problem Details field `fehler[{feld, meldung}]` | `errors[{field, message}]` |
| query parameter `inklusiveInaktive` | `includeInactive` |
| endpoint `…/reihenfolge` | `…/order` |
| `DevTestdaten`, `TestDatenbank.leeren` | `DevSampleData`, `TestDatabase.clear` |

## Frontend

| German (old code) | English |
|---|---|
| `…Seite.tsx` | `…Page.tsx` (`EmployeesPage`, `SettingsPage`, `HomePage`, `SystemPage`, `ComponentsPage`) |
| `…Verwaltung.tsx` | `…Settings.tsx` (`LiftSettings`, `ServiceItemSettings`) |
| `Felder.tsx`: `Textfeld`, `Textbereich`, `Auswahl`, `Checkbox` | `Fields.tsx`: `TextField`, `TextArea`, `Select`, `Checkbox` |
| `useBestaetigung` / `bestaetige({ titel, text, gefaehrlich })` | `useConfirm` / `confirm({ title, text, dangerous })` |
| `Menue`, `MenueEintrag` | `Menu`, `MenuItem` |
| `useToast().erfolg/fehler/info` | `useToast().success/error/info` |
| `Namensschild` | `NameBadge` |
| `Stammdatenliste` | `MasterDataList` |
| `ApiFehler`, `datenOderFehler`, `meldungFuerFeld`, `istKonflikt` | `ApiError`, `dataOrThrow`, `messageForField`, `isConflict` |
| `formatDatum/Uhrzeit/Zeitpunkt` | `formatDate/Time/Timestamp` |
| `geraetPerson`, `useDarfAendern` | `devicePerson`, `useCanEdit` |
| `PersonWahl`, `PersonAnzeige`, `LiveAnzeige` | `PersonPicker`, `PersonMenu`, `LiveIndicator` |
| Props `variante`, `klein`, `laedt`, `offen`, `onSchliessen`, `fuss` | `variant`, `small`, `loading`, `open`, `onClose`, `footer` |
| Button variants `primaer/sekundaer/gefahr/ghost` | `primary/secondary/danger/ghost` |

### Design tokens (`styles/tokens.css`)

| German | English |
|---|---|
| `--farbe-*` (`hintergrund`, `flaeche`, `flaeche-erhoeht`, `rand`, `rand-stark`, `text-gedaempft`, `akzent`, `auf-akzent`, `erfolg`, `warnung`, `gefahr`, `fokus`) | `--color-*` (`background`, `surface`, `surface-raised`, `border`, `border-strong`, `text-muted`, `accent`, `on-accent`, `success`, `warning`, `danger`, `focus`) |
| `--abstand-1…8` | `--space-1…8` |
| `--schrift`, `--schrift-klein/normal/gross/titel/seitentitel` | `--font`, `--font-size-sm/md/lg/title/page-title` |
| `--radius-klein/gross`, `--schatten` | `--radius-sm/lg`, `--shadow` |
| `--ebene-kopfzeile/menue/toast` | `--layer-header/menu/toast` |

## What stays German

- **Everything the user sees**: UI texts, labels, toasts, user-facing error messages
  (`detail`/`title` of Problem Details, validation messages, `InvalidInputException` messages).
- **Product and infrastructure names**: "Krügel Werkstatt", the repository `kruegel-werkstatt`,
  database name/user `werkstatt`, Docker project, Maven artifact – renaming them would break
  existing installations (database volume) for no benefit.
- **Merged Flyway migrations V1–V5**: Flyway stores a checksum of every applied migration;
  changing even a comment would stop the app from starting on existing databases.
  The rename happens in `V6__english_names.sql`.
- **The analysis of the old app** (`docs/analysis/`): a historical record that quotes the old UI
  and its screenshots.
