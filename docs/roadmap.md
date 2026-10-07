# Roadmap

Plan for the rebuild in small packages. Every package = one branch + one pull request,
`main` always stays runnable. The order within a phase is binding,
phases build on each other.

Sources: [`analysis/TIEFENANALYSE_NEUBAU.md`](analysis/TIEFENANALYSE_NEUBAU.md) (feature scope, bugs #1–#15),
[`analysis/UI_REVIEW.md`](analysis/UI_REVIEW.md) (findings F1–F12, UI improvements) – both in German.

**Principle:** every feature of the old app is kept – none of its bugs.

---

## Overview

| Phase | Topic | Result |
|---|---|---|
| 1 | Skeleton ✅ | Repository, backend, database, frontend, Docker Compose |
| 2 | Foundation ✅ | CI, conventions, API contract, basic UI components, live updates |
| 3 | Employees ✅ | First business module = template for all others |
| 4 | Master data ✅ | Lifts, service items, courtesy cars, public holidays |
| 5 | Customers, vehicles, import | SwissGarage import on the server, customer search |
| 6 | Tasks & appointments | Core of the app: wizard, day/week view, drag & drop, printing |
| 7 | Courtesy car bookings | One data source, double booking impossible |
| 8 | To-dos & pinboard | Team communication |
| 9 | Absences | Employee calendar + correct statistics |
| 10 | Dashboard (TV) | Kiosk view for the workshop TV |
| 11 | Migration & go-live | Take over data, backup, NAS, switch-over |

---

## Phase 1 – Skeleton ✅

- [x] 1a – Repository & structure
- [x] 1b – Backend skeleton (health endpoint)
- [x] 1c – PostgreSQL + Flyway
- [x] 1d – Frontend skeleton
- [x] 1e – Everything in Docker Compose

## Phase 2 – Foundation ✅

Cross-cutting topics every business module needs. Solved once properly instead of in every module.

- [x] **2a – CI with GitHub Actions**
  On every PR: backend tests (incl. Testcontainers), frontend lint + build, build Docker images.
  A PR can only be merged when everything is green.
- [x] **2b – Backend conventions**
  Introduce JPA; base class for entities (UUID ID, `createdAt`/`updatedAt`, `@Version` for
  optimistic locking); time zone `Europe/Zurich`; ISO JSON date format.
- [x] **2c – Error handling & validation**
  Uniform error responses (RFC 9457 *Problem Details*), Bean Validation for input,
  409 on concurrent edits (optimistic locking). Tests for it.
- [x] **2d – API contract**
  OpenAPI description from the backend (springdoc), TypeScript types for the frontend
  generated from it – no hand-written API types.
- [x] **2e – Frontend foundation: routing & data queries**
  React Router (one URL per page), TanStack Query (loading, caching, reloading),
  app layout with navigation. Central formatting: dates always `dd.mm.yyyy` (→ F7).
- [x] **2f – Basic UI components**
  Design tokens (colors, spacing, font), button, input fields with label, select, modal
  (Esc closes, sticky footer), toast (not behind other elements), confirmation dialog.
  Touch-friendly sizes (min. 44 px). Font + icons local instead of CDN (works without internet).
  Dropdowns close on Esc/click outside (→ F9).
- [x] **2g – Live updates (SSE)**
  The backend tells all devices "X has changed", the frontend reloads the affected data.
  Replaces Socket.IO of the old app. Connection status visible in the UI.

## Phase 3 – Employees ✅

Simplest business module. This is where the pattern (DB → entity → service → API → UI → tests)
is created that all further modules follow.

- [x] **3a – Employee data model**
  Table + entity: name, role (mechanic/office/intern/apprentice/management),
  color, birthday, vacation days, flags (selectable as mechanic / for to-dos & notes /
  own pinboard column), active. Sample data only in the development profile (→ bug #9).
- [x] **3b – Employee API**
  CRUD endpoints, validation, integration tests. Delete = deactivate (history stays).
- [x] **3c – Employee page**
  List + form (consistent labels/placeholders, distinguishable colors, role
  management selectable). Text color derived from the background automatically.
- [x] **3d – "Who am I?" per device**
  No login, but every device picks a person once. Stored with every change
  ("changed by"). TV device = "view only". (→ bug #11, deliberately without password)

## Phase 4 – Master data ✅

- [x] **4a – Configurable lifts**
  Table instead of 3 hard-coded lifts; number/names changeable. (→ bug #13)
- [x] **4b – Configurable service items**
  Ölwechsel, Wischblätter, Klimaservice, … as a maintainable list instead of 8 fixed checkboxes.
- [x] **4r – Refactoring: English code** *(inserted before 4c)*
  The code language becomes English, **the app stays German** (all UI texts and user-facing
  error messages). No new behaviour – all tests stay green, only renamed.
  Glossary ([`glossary.md`](glossary.md)), migration V6 renames tables/columns/constraints,
  English API, frontend, docs. Decision: [ADR 0002](adr/0002-english-code.md).
- [x] **4c – Courtesy cars**
  Master data (label, model, license plate, service due, insurance until) with a
  warning when service is due. Form with labels. (→ UI review courtesy cars)
- [x] **4d – Public holidays canton Zurich**
  Calculation on the server (incl. Easter-dependent holidays) + endpoint + tests.

## Phase 5 – Customers, vehicles, SwissGarage import

- [x] **5a – ADR 0003: customers as master data or only as an import copy?**
  Decided: **hybrid** – SwissGarage records (import only, read-only) + local records (walk-ins),
  tasks reference by ID. [ADR 0003](adr/0003-customers-and-vehicles.md)
- [x] **5b – Customer & vehicle data model**
  `source` SWISSGARAGE/LOCAL, SwissGarage number as key, incl. company customers (own field
  instead of "last name"); local customers editable via API, SwissGarage ones read-only.
- [x] **5p – License plate input & display** *(inserted after 5b, user request)*
  Input in parts (country → canton → number, foreign: country code + free number) with live
  preview; display as a real Swiss plate (flag, "SG·197 052", canton coat of arms). Stored as one
  normalised text ("SG 197052"). Used for courtesy cars now, later for vehicles in the wizard.
- [x] **5c – Import address list (server side)**
  Excel upload to the backend, filter "garage customer"/not blocked, update instead of
  replacing everything, import log (date, number new/changed).
- [x] **5d – Import vehicle list**
  Assign vehicles to the customer, convert Excel date values (MFK) correctly.
- [x] **5e – Customer search API**
  Search by name, company, address, phone, license plate, VIN; every word must match;
  hits with their active vehicles, vehicles without holder too (`GET /api/customer-search`).
- [x] **5f – Import page**
  `/settings/swissgarage`: drop or choose both exports, result with problems, "last imported
  on …", counts, search through the data (5e), import log. No delete button: SwissGarage
  records are real records that orders will refer to – the import deactivates instead (ADR 0003).

## Phase 6 – Tasks & appointments

Core of the app, therefore split more finely. ("Task" = Auftrag/Termin, see glossary.)

- [x] **6a – Task data model**
  References customer/vehicle (vehicle may still be open)/mechanic/lift; status as enum
  (received, in progress, waiting for parts, done) and **waiting customer as a separate flag**
  (→ bug #4, status/flag mix-up); arrives earlier / ready by; tire change, MFK, service items,
  parts incl. supplier; task number (external, optional, unique); order per lift/day.
- [x] **6b – Task API**
  Create, edit, change status, add task number, delete (logged with the person), list a period
  (max. 92 days). Optimistic locking on edit; status/task number without version. Newly chosen
  references must be active, existing ones stay valid. Sample tasks in the dev data.
- [x] **6c – Wizard step 1: customer & vehicle**
  `/tasks/new` (not in the navigation until 6e): customer search with up to 50 hits, a click on a
  vehicle chooses customer and vehicle; walk-in customer/vehicle in a dialog (labels, placeholders
  only "z. B."); vehicle may stay open; MFK estimate (4-3-2-2 rule) with warning; the customer's
  last tasks on the right.
- [x] **6d – Wizard step 2: appointment & work**
  Defaults: arrives earlier = evening of the previous working day, ready by = same evening,
  MFK on the appointment day – they move along when the date changes. Week overview sticky
  (07:00–17:30, holidays, "n Termine"), click on a slot takes over date + time; footer with
  the buttons always visible. Saving follows in 6e.
- [x] **6p – Company profile** *(inserted: the letterhead of 6e needs it)*
  Settings: company name, address, phone, e-mail, website and logo upload (PNG/JPEG/WebP/SVG,
  max. 1 MB, type detected from the content). Name and logo appear in the navigation and as
  letterhead on the task sheet.
- [x] **6e – Wizard step 3/4 + task sheet**
  Step 3 "Prüfen & speichern" (every block can be changed, server errors in words), clear
  "saved" confirmation with print / next task / start; task sheet `/tasks/:id/sheet`: A4 white
  paper, letterhead from the company profile, customer address, **all ticked work as a
  checklist** (→ F1). "Neuer Auftrag" in the navigation.
- [x] **6f – Appointments: day view by lift**
  `/tasks?date=…` ("Termine"): one column per lift + "Ohne Lift"; cards with time, status
  (colors from one place, F10), customer, vehicle, mechanic badge, waiting customer, ready by,
  all work. Drag & drop with mouse, touch (press briefly) and keyboard; `PUT /api/tasks/{id}/move`
  renumbers **both** affected columns (→ bug #5). Empty day: "Nächster Termin …".
  Courtesy car symbol follows with the bookings (7c).
- [x] **6g – Appointments: week view**
  `/tasks?view=week` – "Tag | Woche" switch on the "Termine" page; one column per day (Mo–Fr,
  weekend only with tasks), holidays, equal headers, click on a day opens its day view.
  Drag & drop onto another day: same time, same lift, end of the lift column; "kommt früher" /
  "fertig bis" move along, the MFK appointment (booked at the station) stays (→ bug #6: no time
  guessing). Search over all appointments, upcoming first (→ F11). Absences follow with 9a.
- [x] **6h – Task detail**
  `/tasks/:id` as readable text (no fake form): status buttons, task number inline, sheet, delete
  with confirmation, history (created/changed by). Label "Mechaniker". Local customer/vehicle data
  editable right there, SwissGarage data with a hint. `/tasks/:id/edit`: the wizard form incl.
  changing customer/vehicle, sticky footer, conflict with "load current state". A click/Enter on a
  card opens the task. Creating notes/to-dos from the task follows with 8a/8c.
- [x] **6i – Task list**
  "Termine" → "Liste" (`/tasks?view=list`, filters in the URL): period presets (today, this week,
  next 2 weeks, last 30 days) or from/to, status toggles + "Nur offene", mechanic, text filter;
  sortable columns (empty values last, status in its natural order); work column complete (→ F1);
  status from the one definition (→ F10); missing task number always "offen". No delete in the
  rows (misclick) – a row opens the task, deleting is there with confirmation.

- [x] **6x – Smoke test fixes** *(inserted)*
  Drag & drop: no flash back of the old position after dropping; task number already in the wizard;
  MFK appointment on day/week cards and in the task detail, "Letzte MFK unbekannt" instead of the
  misleading "MFK-Datum unbekannt".
- [x] **6j – Task duration (model & API)** *(inserted, from the smoke test)*
  End time per task (default start + 1 h, also for existing tasks); the database prevents two tasks
  on the same lift at the same time (like the courtesy cars); moving keeps the duration.
  Wizard/edit with "bis" fields and duration, start–end on cards, detail, sheet and list.
  Fixed on the way: `hibernate.jdbc.time_zone: UTC` shifted local times outside UTC JVMs.
- [x] **6k – Day view as time grid per lift** *(inserted)*
  Like Outlook: columns = lifts, rows = time, tasks as blocks as long as their duration; tap and drag
  in the grid = new task with start/end; move a block / drag its end = change the time. The manual
  order of 6f is replaced by the time. Capacity overview in the wizard with durations, select by dragging.
  `PUT /api/tasks/{id}/schedule` replaces `/move`, V15 drops `sort_order`; `GET /api/tasks/day` also
  brings tasks of earlier days still on their lift; "now" line; collisions shown red while dragging.

## Phase 7 – Courtesy car bookings

- [x] **7a – Booking data model**
  `courtesy_car_booking`: one table for all bookings – for a task (cascade on delete) or with a
  free-text holder. The database prevents overlapping bookings of the same car (exclusion
  constraint, `btree_gist`), half-open periods, an early return frees the car, a late return can
  still be recorded. (→ bug #2, F2)
- [x] **7b – Availability & booking API**
  `GET /api/courtesy-car-bookings/availability?from&to` – THE check for wizard, task and courtesy car
  page (free, or the bookings in the way; a booking being moved does not count against itself).
  Book (task or holder), move, cancel, record the return (empty = now) and undo it. Overlaps → 409
  naming the booking in the way; a race between two devices gets the same friendly message.
- [x] **7c – Booking in a task**
  Selection in wizard/task with an understandable availability table.
  Wizard: section "Ersatzwagen", pickup/return follow "kommt früher"/start and "fertig bis"/end until
  changed; task and booking saved together (`POST /api/tasks/with-courtesy-car`, both or neither).
  Task detail: book, change, cancel, "ist zurück" (from pickup on) and undo.
- [x] **7d – Courtesy car page**
  Cards with correct status, occupancy calendar (free/booked clearly visible),
  drag booking, period changeable in the panel (→ F12).
  Page `/courtesy-cars` in the main navigation: cards (free / unterwegs / überfällig, next
  reservation, service & insurance), 14-day calendar (drag open free days, drag planned bookings to
  another day/car, click = panel), panel with editable period, return, cancel, link to the task.
  Availability also says when a car is overdue (not back) – a warning, not a conflict.

## Phase 8 – To-dos & pinboard

- [x] **8a – To-do data model & API**
  Person as reference (instead of name), deadline, shopping list flag, reference to task/note
  by ID instead of task number text (→ bug #14). Then "To-do" directly in the task detail (left open in 6h).
  `todo` (V16) with done at/by; `/api/todos` (open by deadline, latest done, filters person/shopping/task),
  tick off without version, undo. Task detail: card "To-dos" (checkbox only – F5, done ones with
  "Rückgängig"). The note reference follows with 8c (the note does not exist yet).
  Also in this package: courtesy car on the task sheet and the calendar cards; courtesy car page
  layout (full-width calendar, clearer cards).
- [x] **8b – To-do page**
  Person filter from the employee list (→ bug #3), active filter recognisable,
  own tab shopping list, done only via checkbox with "undo" (→ F5).
  `/todos` in the navigation; filter and tab in the address; "nicht zugewiesen" as filter and label,
  "überfällig seit …"; edit in place, delete after asking (also in the task detail); done ones
  folded away with "Rückgängig".
- [x] **8c – Note data model & API**
  Multiple assignment, reference to task (→ F8), sub-tasks are to-dos only
  (no second list → bug #10), archiving completes linked to-dos, reactivating symmetric.
  Then "Notiz" directly in the task detail (left open in 6h, UI review: no modal-in-modal).
  V17 `note` + `note_assignee`, `todo.note_id`; `/api/notes` (board with filters, archive with search,
  `POST /{id}/todos` for sub-tasks). The to-do knows its note only by ID (no package cycle).
  Task detail: card "Pinnwand" (notes of the task, add one for chosen people, archive after asking).
- [ ] **8d – Pinboard page**
  Columns from the employee list (→ bug #3), same order as dashboard, drag between
  columns, detail modal (large text field, visible save), archive with search.

## Phase 9 – Absences & employee calendar

- [ ] **9a – Absence data model & API**
  Category as enum (vacation, sick, external work + company, training) (→ bug #1).
  Then show absences in the week view of the appointments (left open in 6g).
- [ ] **9b – Calendar page**
  Continuous bars instead of single boxes, fixed column width, 4 distinguishable colors,
  weekends + public holidays marked, drag selection → entry, always loads (→ F3).
- [ ] **9c – Statistics on the server**
  Vacation days = working days (without weekends/holidays) (→ F6), balance per person,
  external work per company.

## Phase 10 – Dashboard (TV kiosk)

- [ ] **10a – Layout & week grid**
  With day headers (→ UI review dashboard), appointments + absences per day, navigation at the bottom.
- [ ] **10b – Today by lift, mini pinboard, to-dos**
  Empty state "next appointment …", readable column names, overdue to-dos with date.
- [ ] **10c – Kiosk mode for the TV**
  Large font, high contrast, clock + connection status, date updates itself
  (→ bug #15), no accidental actions by touch (→ F5).

## Phase 11 – Migration & go-live (version 1)

- [ ] **11a – Migration script**
  Old SQLite data (employees, courtesy cars, tasks, to-dos, notes, absences,
  bookings) into the new schema; resolve names → IDs; log what could not be assigned.
- [ ] **11b – Trial run & comparison**
  Migration on a copy, spot checks against the old app.
- [ ] **11c – Backup & restore**
  Daily `pg_dump` into `Datensicherung/`, retention, tested restore.
- [ ] **11d – Deployment to the NAS**
  Container Manager, images (via GitHub Container Registry), `.env` with its own password,
  check memory limits.
- [ ] **11e – Parallel operation & switch-over**
  Both apps in parallel (8080 old / 8090 new), final migration, switch off the old app.

---

## Deliberately NOT taken over

| Old app | Reason |
|---|---|
| `GET /api/reset` (deletes everything) | Dangerous, not needed (→ bug #12) |
| Offline mode (`file://` + `localStorage`) | Decided: internal network only |
| Empty functions `autoSave`/`startPolling`, duplicated code | Leftovers (→ bug #7, #8) |
| Two different demo data sets | One sample data set in the development profile (→ bug #9) |

## Tracking: bugs & findings → package

| Finding | Package | | Finding | Package |
|---|---|---|---|---|
| Bug #1 statistics always 0 | 9a, 9c | | F1 work missing on sheet/list | 6e, 6i |
| Bug #2 courtesy cars 2 data sources | 7a, 7b | | F2 courtesy car double bookable | 7a |
| Bug #3 names hard-coded | 8b, 8d | | F3 calendar empty | 9b |
| Bug #4 status texts inconsistent | 6a | | F4 import preview empty | 5f |
| Bug #5 order only partly saved | 6f | | F5 to-do done by row click | 8b, 10c |
| Bug #6 dead drag code (time) | 6g | | F6 vacation counts weekends | 9c |
| Bug #7/#8 duplicates, empty functions | – | | F7 mixed date formats | 2e |
| Bug #9 two demo data sets | 3a | | F8 note task reference missing | 8c |
| Bug #10 note sub-tasks twice | 8c | | F9 dropdown stays open | 2f |
| Bug #11 no traceability | 3d | | F10 contradictory status colors | 6i |
| Bug #12 `/api/reset` | – | | F11 search only current week | 6g |
| Bug #13 3 lifts hard-coded | 4a | | F12 courtesy car period not changeable | 7d |
| Bug #14 reference via task number text | 8a | | | |
| Bug #15 date never updates | 10c | | | |

## Open decisions (settled in the respective package)

| Question | When |
|---|---|
| Enforce the format of the task number or free text? | 6a |
| Take over the time when moving in the week view? | 6g |
| Real connection to SwissGarage/C16 possible later? | after version 1 |
