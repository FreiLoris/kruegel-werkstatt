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
| 11 | Go-live | Backup, NAS, go-live checklist (no data migration – decided 2026-10-07) |
| 12 | Feedback from the workshop | Wishes after the first days in use (10/2026) |
| 13 | Second test round | FB-01 … FB-10, tyre hotel (10/2026) |
| 14 | Third test round | FB-11 … FB-21: shopping list, planning, tyres (10/2026) |
| 15 | Extras | Wishes beyond the daily work (10/2026) |
| 16 | Fourth test round | FB-22 … FB-33: import, shopping, absences, tyres, whiteboard (10/2026) |

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
- [x] **8d – Pinboard page**
  Columns from the employee list (→ bug #3), same order as dashboard, drag between
  columns, detail modal (large text field, visible save), archive with search.
  `/pinboard`: "Neu" + people with a pinboard column (employee order – the dashboard follows it);
  dragging swaps only that person (`PUT /api/notes/{id}/move`, no version); notes of people without
  column stay visible in "Neu". Dialog: growing fields, "Gespeichert ✓", people, task via search,
  sub-tasks. Archive grouped by month with search, "Wieder auf die Pinnwand".

- [x] **8e – Pinboard and to-dos together** *(inserted, wish of the user)*
  One place "Pinnwand" with the views board / to-do list / shopping list / archive (`/todos` redirects).
  A person's column shows their notes AND their open to-dos (drag by the grip = other person,
  `PUT /api/todos/{id}/assignee`); "+ Notiz" / "+ To-do" per column; the board uses the full width.
  Task detail: one card "Pinnwand & To-dos". The data model stays separate (note = information,
  to-do = one action to tick off; sub-tasks of a note are to-dos since 8c).

## Phase 9 – Absences & employee calendar

- [x] **9a – Absence data model & API**
  Category as enum (vacation, sick, external work + company, training) (→ bug #1).
  Then show absences in the week view of the appointments (left open in 6g).
  Done: `absence` table (V18) with half days (first day from noon, last day until noon), company
  only for external work, no overlap per person – the service names who/what is in the way, the
  DB constraint (`EXCLUDE USING gist`) is the safety net. `/api/absences` (list by period/person,
  create, change with version, delete). Week view: chips "Name · Kategorie (Vormittag)" under each
  day's head, category color + text.
- [x] **9b – Calendar page**
  Continuous bars instead of single boxes, fixed column width, 4 distinguishable colors,
  weekends + public holidays marked, drag selection → entry, always loads (→ F3).
  Done: "Mitarbeiter" opens on the month calendar (views Kalender / Liste, month in the address).
  One row per person (+ former ones who were away that month), one bar per absence in half-day
  steps, birthdays marked. Drag open days (tablet: hold first) → dialog with person, category
  (4 colored buttons), from/until with "erst ab Mittag"/"nur bis Mittag", company for external
  work; click a bar = change or delete it (view-only devices: just show). Overlap: red outline
  while dragging, the server's message at "Von".
- [x] **9c – Statistics on the server**
  Vacation days = working days (without weekends/holidays) (→ F6), balance per person,
  external work per company.
  Done: `GET /api/absences/statistics?year=` counts in half working days (`AbsencePeriod.workingHalfDays`),
  an absence over New Year is split between the years. Per person: entitlement, vacation taken
  (up to today) / planned (from tomorrow) / left, sick, training, external work days; per company
  (spelling variants together): days, assignments, who. "Mitarbeiter" → view "Statistik" with the
  year in the address, key figures, a vacation bar per person (red when over the entitlement).

## Phase 10 – Dashboard (TV kiosk)

- [x] **10a – Layout & week grid**
  With day headers (→ UI review dashboard), appointments + absences per day, navigation at the bottom.
  Done: the dashboard is the start page (`/`). Decision with the user: full screen with the
  navigation at the bottom (+ live status) only on the "view only" device (the TV) – office PC and
  tablets keep the normal header there. The week (weekend: the coming one) with large day heads,
  holidays, who is away and compact appointment rows (time, customer, lift, mechanic, status bar);
  a click opens the task.
- [x] **10b – Today by lift, mini pinboard, to-dos**
  Empty state "next appointment …", readable column names, overdue to-dos with date.
  Done: below the week "Heute nach Lift" (every lift in service, "frei" when empty, also the task
  from yesterday still up; no appointment today → the next one within 60 days) and "Pinnwand &
  To-dos" – the 8e columns in small (name badges, notes with sub-task progress, to-dos most urgent
  first with "überfällig seit …", at most 3 notes / 5 to-dos per person + "+ n weitere"). Only to
  look at: nothing can be ticked off on the dashboard (F5), the pinboard is one click away.
- [x] **10c – Kiosk mode for the TV**
  Large font, high contrast, clock + connection status, date updates itself
  (→ bug #15), no accidental actions by touch (→ F5).
  Done: ONE clock for the app (`lib/clock.ts`, `useToday`/`useClock`, one timer at the full
  minute) – every page with "today" moves on over midnight, queries load the new day. On the TV:
  125 % text, lighter secondary text and lines, date + time + live status at the bottom, nothing
  to select or long-press, back to the dashboard after 2 minutes without touch on another page.
  The week on the dashboard: one line per appointment, at most 6 per day + "+ n weitere", so
  everything fits one screen.

## Phase 11 – Go-live (version 1)

**Decision 2026-10-07 (user):** the old app was never in production – nothing of its data is
taken over. Go-live = fresh database, the two Excel files again via the SwissGarage import, Reto
created as "Geschäftsführung". 11a (migration script) and 11b (trial run of the migration) are
dropped, and so is the parallel operation in 11e.

- [x] **11c – Backup & restore**
  Daily `pg_dump` into `Datensicherung/`, retention, tested restore.
  Done: `backup` container (postgres image, cron at 02:00 Swiss time, `BACKUP_DIR`,
  `BACKUP_KEEP_DAYS`), `backup.sh` / `restore.sh` (refuses without `--yes`, one transaction).
  Restore tested after deleting a whole test instance incl. its volume – see
  [`operations.md`](operations.md).
- [x] **11d – Deployment to the NAS**
  Container Manager, images (via GitHub Container Registry), `.env` with its own password,
  check memory limits.
  Code part: CI pushes `backend`, `frontend` and `backup` images to ghcr.io after every merge
  (`latest` + commit tag; since 11f `dev`); `deploy/nas/compose.yaml` (since 11f
  `deploy/compose.yaml`) only pulls them (no default password, no
  open DB port, `pull_policy: always`); the backup scripts are in their own image. Guide for the
  NAS steps: [`deployment-nas.md`](deployment-nas.md). NAS: DS224+ (Intel), 2 GB RAM.
  Done 2026-10-07: project `kruegel-werkstatt` in Container Manager, all four containers running,
  app answers on port 8090. Lesson: Container Manager shows no error text – the first start
  failed with `manifest unknown` because of a typo in `APP_VERSION` in `.env`.
- [x] **11e – Go-live**
  Done: the workshop works with the app on the NAS (confirmed by the user 2026-10-24).
  Checklist: own DB password in `.env`, SwissGarage import of both Excel files, create Reto
  (Geschäftsführung) and the team, set up the TV as "Nur ansehen", first backup checked,
  switch off the old app.
- [x] **11f – Release and dev packages** (wish of the user, 2026-10-23)
  Two channels of the images instead of one `latest` after every merge:
  - **dev**: every merge to `main` (as today) – Reto's local Docker instance in his office pulls
    it (the user sets it up there himself), so new work can be tried before it goes live.
  - **release**: a version tag (e.g. `v1.2.0`, GitHub release) builds the release images, tagged
    with the version and `latest` – the NAS instance pulls `latest` automatically (e.g. a scheduled
    `docker compose pull && up -d`, or Watchtower), so the workshop only gets released versions.
  Decided 2026-10-24 (user): Watchtower, on the NAS and on the test instances (Reto, Loris).
  Done: CI pushes `dev` + commit tag after every merge (no more `latest`); `release.yml` (*Actions →
  Release → Run workflow*, version) gives these very images `v…` and `latest` and creates the
  GitHub release with generated notes. One `deploy/compose.yaml` for every instance with a
  `watchtower` service (maintained fork `nickfedor/watchtower`, only labelled containers – never
  the database, `UPDATE_SCHEDULE`), the channel from the `.env`: `release.env.example` /
  `dev.env.example`. Guide: [`deployment-nas.md`](deployment-nas.md) (Releases, test instances).

## Phase 12 – Feedback from the workshop (10/2026)

After the first days in use the workshop wrote down 13 wishes (`Feedback Werkstattplaner.txt`,
2026-10-09). The numbers in brackets are the points of that list in its order.

- [x] **12a – Wizard polish** (2, 6, 7, 8)
  Done: (2) choosing the vehicle – or "noch offen" – goes on to step 2 by itself; it reacts to
  the click, so coming back to step 1 stays there and "Weiter" is still there for that.
  (6) "Muss fertig sein bis" presets the day of the appointment at 17:30 (was 17:00); saved
  tasks keep their own time, the default return of a courtesy car follows. (7) "Service" is a
  tick like Radwechsel and MFK – the items only appear when it is ticked, unticking clears them,
  ticked without an item is an error. (8) The material order is entered in its own window
  (`PartsDialog`); the form shows it in one line with "Ändern". Both the wizard and "Auftrag
  bearbeiten" use it. Point (5) was planned here and is asked back instead (question 6).
- [x] **12b – The day view shows more** (11, 12, 13)
  Done: above the lifts the day view shows who is away or in (the chips of the week view, a click
  opens the entry) and the open to-dos due that day, to tick off right there. (13) "Anwesend" is
  a fifth category of the absences (V19) – entered, shown and kept free of overlaps like the
  others, with half days; the statistics leave it out. The button "Anwesend" in the day view
  presets the person of the device, the day and the category: two clicks. The employee calendar
  has its own button "Anwesenheit" next to "Abwesenheit" with the same presets (12g). Decided against clock
  times for now – half days are what the calendar and the chips already know.
- [x] **12c – Material order → shopping list** (10)
  Done: the shopping list shows "Material für Aufträge" – every task whose parts are still "zum
  bestellen", the next appointment first, with a link to the task. "Bestellt" sets the status of
  the parts order (and remembers the day); then it is gone from the list. Deliberately NOT a
  copied to-do: one source, the parts order of the task (the old app's bugs #2 and #10 were two
  lists of the same thing). New: `GET /api/tasks/parts-to-order`, `PUT /api/tasks/{id}/parts-status`.
- [x] **12d-1 – Task number by the app, "Angenommen von"** (9, 1)
  Done: (9) the app assigns the task number when the task is created – year and running number,
  "26-0001" (`TaskNumbers`, counter row per year locked in the saving transaction: no duplicates,
  no gaps from failed saves). The field is gone from the wizard; in the task the number can be
  corrected, not removed. V20 numbers the tasks entered so far in the order they were created;
  numbers typed by hand stay. (1) "Angenommen von" is a required choice in step 2 of the wizard,
  never preset (the PCs are shared); shown in the task and on the sheet. Tasks from before have
  none – editing one asks for it.
- [x] **12d-2 – Appointments without time: "Zeit offen"** (4)
  Done: a tick "Uhrzeit noch offen" in the wizard and when editing (`task.time_open`, V21). Start
  and end stay in the data – they reserve the lift and place the block in the day view – but
  everywhere a clock time was shown it now says "Zeit offen" (`periodLabel`/`startLabel` in
  `taskTime.ts`: day and week cards, dashboard, list, search, sheet, links from to-dos and notes).
  The task itself and the review step add "Lift reserviert 08:00–09:00". Moving the block keeps
  the flag.
- [x] **12d-3 – Orders without appointment** (3)
  Done: a task may have no appointment (V22: day, time and end empty together; then no lift, no
  "kommt früher"/"fertig bis", no waiting customer – so the lift rule never sees it).
  `Appointment.NONE` in the backend; in the frontend `AnyTask` (may be unplanned) and `Task`
  (planned – everything in the calendars), so the calendar views need no "if no date".
  - Wizard and "Auftrag bearbeiten": tick "Noch kein Termin"; dragging a place in the grid plans it.
  - "Termine › Ohne Termin" with the number of waiting orders on the button; the oldest order on top.
  - Dashboard (12f): the title row names them ("2 ohne Termin · Huber Peter · …") – they are in
    no day of the week, and the TV must not get higher.
  - In the task: "Aus Planung nehmen" (`DELETE /api/tasks/{id}/appointment`) – day and lift
    become free, work and mechanic stay. Planned again by editing it.
  - Everywhere a task is named without a day it says "ohne Termin" (`whenLabel`); the search
    lists such orders first.
  Decided: the number is assigned right away, also without appointment (the feedback asked for
  "only once an appointment exists") – the list must be able to name the order. A booked
  courtesy car stays booked when its task leaves the plan.

- [x] **12e – "Fahrzeug kommt früher" presets the day of the appointment** (5)
  Done: ticking it presets the day of the appointment at 07:00, when the workshop opens (was: the
  evening of the working day before). An appointment at or before 07:00 leaves no "earlier" on
  its day – then the evening before, as it was. The preset follows when date or time of the
  appointment change; a date or time typed by hand stays. Built on the wording of the feedback
  ("ausgewähltes Datum", like "Muss fertig sein") – the workshop has not answered question 6.

- [x] **12h – The dashboard says who is in today**
  Done: a line "Heute da" under the title – name badges of who is in (with "Vormittag" /
  "Nachmittag"), behind it who is away and why. The rule (`presenceOn`): regular hours = in on
  every working day without an absence; flexible hours = in only when entered as "Anwesend";
  nobody with regular hours is expected on weekends and public holidays. "Flexible Arbeitszeit"
  is a setting per person (`employee.flexible_hours`, V23) – no name in the code.

Answers of the workshop (2026-10-11) and what follows from them:

1. **Task number:** the app assigns it. In future the workshop only works with the order sheets
   of this app; SwissGarage is used for the invoice only. → generated number, format still to
   decide; the free-text field goes. Decided (Loris, 2026-10-11): year + running number, e.g.
   `26-0001`; SwissGarage numbers already entered stay as they are.
2. **"Annehmer":** everyone uses every PC, so "the person of the device" is whoever chose first.
   The workshop suggests asking again after some time without input. → open: ask again when
   idle, or choose "Angenommen von" in the wizard. Decided (Loris, 2026-10-11): a required
   field "Angenommen von" in the wizard, without preset; no asking again when idle.
3. **Without appointment:** a list. New: orders also LOSE their appointment – e.g. while waiting
   for parts – and must stay visible so they are not forgotten. → "Ohne Termin" list, and an
   action to take a planned order out of the plan again.
4. **Without time:** the lift stays occupied, but no clock time is shown, so nobody thinks the
   car comes at exactly that time. → the time stays in the data (the block in the grid), a flag
   "Zeit offen" hides it; only the date becomes optional (point 3).
5. **Presence:** yes – done in 12b.
6. "Fahrzeug kommt früher" (preset): not answered. Built in 12e as the feedback is worded – to
   confirm with the workshop: the day of the appointment at 07:00.

---

## Phase 13 – Second test round of the workshop (10/2026)

Ten tickets FB-01 … FB-10 from the second test round (2026-10-13), plus a UI concept for the
tyre hotel. The order follows the workshop's suggestion: quick fixes → material (FB-04, FB-08,
FB-09) → FB-05 → FB-06, FB-10 → tyre hotel FB-07 (several packages of its own).

- [x] **13a – The note counter follows its sub-tasks** (FB-03)
  Done: ticking off, editing or deleting a sub-task of a note left the note's counter ("0/1") as it was
  until the page was reloaded – on this device (only the to-dos were refetched) and on the others
  (only the topic `todos` was announced). Now both: the to-do hooks refetch the notes too, and a
  changed sub-task announces `notes` as well.
- [x] **13b – Warning when a vehicle already has a task that day** (FB-01)
  FB-01 is no bug: the "double" appointments in the live app are two tasks each, created a few
  seconds to minutes apart (same vehicle, other lift). Done: the wizard and the edit page show a
  hint under the appointment when the chosen vehicle has another open task on that day or in the
  list "Ohne Termin" – with a link to it (new tab, the form stays filled). Only a hint, saving
  stays possible: a car may come twice on purpose. Done tasks do not count.
- [x] **13c – Pinboard, to-dos and shopping list as pages of their own** (FB-04)
  Done: three entries in the navigation – "Pinnwand" (notes only, still in columns per person),
  "To-dos" (`/todos`, everyone's open ones in columns per person, dragged to reassign; with the
  person filter a list) and
  "Einkaufsliste" (`/shopping`). Each has "Offen | Erledigt" (`done=1`); "Erledigt" on the pinboard
  is the former archive. A to-do of a note links to it ("Notiz" → `/pinboard?note=…`); the note
  lists its to-dos as before. Old addresses (`/pinboard?view=list|shopping|archive`) are forwarded.
  The dashboard tile
  stays one overview per person (notes and to-dos) with links to both pages. When the stock list
  (FB-08) comes, the shopping list moves under "Material".
- [x] **13d – Stock list** (FB-08)
  Done: a list kept by hand (no bookings, no minimum quantities): designation, category (Ersatzteile,
  Verbrauchsmaterial, Werkzeuge), article number, manufacturer, quantity (a number, empty = not
  counted), storage location and remark. Search over all fields, filters for category and place,
  sorted by a column – all in the address (`/stock?location=…`). Printed as filtered, with a line
  saying what and when (e.g. one shelf for an inventory). Storage locations are named freely in the
  settings (like service items: deactivated instead of deleted, in their own order). Navigation:
  one entry "Material" with the tabs "Einkaufsliste | Lager" instead of a new entry each – the TV's
  bottom bar stays on one line; the suppliers (13e) are the third tab.
- [x] **13e – Suppliers** (FB-09)
  Done: the tab "Lieferanten" under "Material" (`/suppliers`): one card each with company, contact
  person, phone, e-mail, webshop (always http(s), "https://" added when typed without), our customer
  number, order channel (Webshop/Telefon/E-Mail), delivery times and remark, and a link to its
  articles (`/stock?supplier=…`). An article has a main supplier and optional further ones, each with
  the supplier's own article number (`stock_item_supplier`, position 0 = main). The stock list filters
  and sorts by supplier, the search finds supplier names and their numbers. A deleted supplier is
  taken off its articles – a further one becomes the main supplier.
- [x] **13f – Storage locations as a tree** (feedback Loris 2026-10-14)
  Done: places nested as deep as needed (`parent_id`), e.g. "1. OG › Büro › Regal 2 › Schublade 3" –
  floors or rooms at the top is up to the workshop. A name once per level ("Lager" under "EG" and
  under "1. OG"). An article lies at any level; the stock list shows the path, sorts in tree order,
  and the filter of a place includes everything inside it (filter "Büro" + print = inventory of the
  room). Settings: the tree with ↑/↓ per level, "+" for a place inside, "Mehr" → rename, move (with
  everything inside, not into itself) and "no longer use" (with everything inside; back again only
  inside a place in use). Existing places became top-level ones. No fixed top level "Werkstatt" –
  everything is in the workshop anyway.
- [x] **13g – Shopping list ↔ stock and suppliers** (FB-08 nice to have, FB-09)
  Done: an entry of the shopping list may name the article in stock and the supplier (`todo.stock_item_id`,
  `supplier_id`, only on the shopping list; a deleted article or supplier leaves the entry). Choosing
  the article fills in its main supplier and, if empty, the text. The open shopping list is grouped
  by supplier ("Ohne Lieferant" last) with order channel, phone and webshop in the heading and the
  supplier's article number at each entry; "Bestellung kopieren" puts one line per entry with the
  number (and our customer number) on the clipboard – also over plain http on the NAS. The stock list
  has a cart button per article (with the main supplier, filled when it is on the list already), the
  supplier card shows its open entries.
- [x] **13h – Absences with clock times** (FB-05)
  Done: sick, external work, training and "Anwesend" have optional times ("ab" on the first day,
  "bis" on the last day, empty = whole day) instead of "ab/bis Mittag" – a doctor 9:00–10:30.
  Vacation keeps the half days (decided 2026-10-14: the vacation statistics count half days). The
  half days entered so far for the other kinds became 12:00. No overlap to the minute (database
  constraint too). The statistics count a time as the halves of the day it touches (9:00–10:30 =
  half a day, 11:00–14:00 = a whole one). Calendar tooltip, chips and "Heute da" show the times:
  "Reto (Krank 09:00–10:30)" away, "Reto ausser 09:00–10:30" in; away "bis 10:30" = in "ab 10:30".
- [x] **13i – Task sheet from blocks, tire change** (FB-06, part 1)
  Done: the sheet is put together from what was ticked – no templates. After the work list comes
  a block per option that has one (`sheetBlocks`; MFK, service and parts get theirs once the
  workshop defines them). Tire change: a table per set (VL/VR/HL/HR: tread depth, brand, model,
  dimension, DOT/age, condition) for the mounted and the removed one – the removed set's depths are
  what goes into the tire hotel – rims Alu/Stahl for wheels, "Radschrauben mit Drehmoment
  angezogen". From the tire hotel: "Lagerplatz" big (a line to write on until FB-07 prints it
  and the stored tire data in); brought: "Abmontierte Räder einlagern? Ja/Nein → Lagerplatz".
  Customer, vehicle and appointment now stand in three columns, so the sheet stays on one A4 page.
- [x] **13j – Insurance case** (FB-06, part 2)
  Done: insurances in the settings (name, phone, e-mail; sorted by name, "Nicht mehr verwenden"
  instead of delete – old tasks still name them). The wizard and the edit page have a section
  "Versicherung": ticking "Versicherungsfall" asks for the insurance (required) and the claim number
  (may follow later). The task keeps `insurance_id` and `claim_number` (V29) – like the "Annehmer"
  outside `TaskDetails`. The sheet prints a block with the insurance, its phone and the claim number
  (a line to write on while it is open); the task detail shows it with phone and e-mail.
- [x] **13k – The MFK appointment in the calendars** (FB-10, part 1)
  Done: with "MFK" ticked the task also asks "Dauer inkl. Fahrt" (default 1 hour) and "Wer fährt?"
  (optional, anyone active) – `mfk_minutes`, `mfk_driver_id` (V30), outside `TaskWork` like the
  insurance. `GET /api/tasks/mfk?from&to` delivers the tasks by their MFK appointment – also an order
  taken out of the plan: the inspection is still booked. The day view shows it as a dashed block in
  "Ohne Lift" at its time (side by side with the tasks there, never draggable – it moves in the task),
  the calendar week and the dashboard (today in "Ohne Lift", the week as a line) on top of the day.
  A click opens the task. Only a hint: it takes nobody's time and no lift. The form says when the MFK
  is before the end of the workshop appointment (a hint, saving stays possible). No extra tick
  "Termin noch offen": an empty time already means that.
- [x] **13l – Inspection stations** (FB-10, part 2)
  Done: stations in the settings (name, address, phone, "Dauer inkl. Fahrt"); V31 creates
  "Strassenverkehrsamt Winterthur-Wülflingen" as the standard (address and phone left to the
  workshop) and gives it to the tasks with MFK so far. Exactly one standard, always in use ("Als
  Standard" moves it; the standard cannot be deactivated). The task gets `mfk_station_id`: ticking
  MFK presets the standard with its duration, another station presets its own duration; an empty
  station in the request = the standard. The station shows on the MFK entry in the calendars, in the
  detail and the summary; the sheet has an MFK block (station with address and phone, appointment
  with duration, who drives – lines to write on while open).
- [x] **13m – Tyre hotel: store, measure, retrieve** (FB-07, part 1)
  Done: a page "Pneuhotel" in the navigation (`/tires`): the sets in the hotel, newest first, searched
  in the browser by customer, plate (with or without spaces), vehicle or tyres; "Ausgelagert" on its
  own tab. "Einlagern": customer and vehicle as in the task wizard, then season (preset by the time of
  year – in autumn the summer tyres come in), wheels or tyres, rims (only wheels), hub caps, bolts,
  brand/model/dimension/year for the set (the newer concept: no DOT per wheel) and the tread depths
  ("Alle vier gleich" or wheel by wheel around the car) with their status right away. After saving
  the page is empty for the next customer. A set has its history (`tire_set_event`: stored, measured,
  retrieved – each with the depths, so the wear can be followed); its depths change only by
  "Nachmessen". The limits are in the settings (summer 3.0, winter 4.0 – all-season like winter –,
  legal minimum 1.6 mm); below: "ansprechen" with the hint "Kunde auf neue Reifen ansprechen".
- [x] **13n – Storage places** (FB-07, part 2)
  Done: locations in the settings ("Pneuhotel – Standorte"): a floor grid (columns A, B, … × rows ×
  sets per field, e.g. `OG-B3-1`) or shelves (shelves × levels × compartments, e.g. `CT-R1-E2-F4`);
  the code is free, nothing is fixed in the code. The places are generated (`tire_place`, V33);
  made smaller, the places beyond are no longer used – refused while a set lies there; a location is
  deleted only while it is empty. One set per place (unique index). The tyre hotel has a view
  "Plätze": the grid or the shelves (top level on top) with free / taken (customer) / taken with
  worn tyres; a click opens the set. Storing proposes the next free place after the one used last (a
  busy day fills one trolley after the other) – "später zuweisen" stays possible. "Umlagern" / "Platz
  zuweisen" on the set; every step of the history names its place as text. Retrieving frees it.
- [x] **13o – Import from SwissGarage** (FB-07, part 3)
  Done: a third card "Pneuhotel (einmalig)" on the SwissGarage import page (after address and vehicle
  list), logged like the others (`import_run.kind` TIRE_HOTEL, V34). Plate → vehicle and holder; else
  the customer by name, whatever the order of the words, only a single hit. "Art" → season and rims
  (Alu-/Stahlfelgen = complete wheels, else tyres only); "Reifen" → the dimension by its pattern, the
  rest brand and model; the depths. The second block of the export ("Anzahl, Art, Reifen" a second
  time – the Excel reader keeps duplicate columns as "Art#2"), RDKS, the remarks and the old place go
  into the remark. No place: the tyre hotel lists them under "Ohne Platz" with "Zuweisen" per row. A
  second run takes nothing twice (same customer, vehicle and season in the hotel = unchanged); a
  row without customer is logged and left to be stored by hand. On the real file (counts only): the
  season of all 77 rows, the dimension of 74 of 76 tyre texts – the customers can only be matched on
  the real data at go-live.
- [x] **13p – Prints** (FB-07, part 4)
  Done: labels for the four wheels (place big, customer · plate, wheel, season · day stored) on A4
  label sheets – the formats in the settings ("Pneuhotel – Etiketten", `label_format`, V35; three
  common ones come with it, to be checked with a test print), checked to fit on A4; the start
  position for opened sheets; the device remembers its sheet. A named page (`@page labels`, no
  margins) keeps the task sheet's margins apart. The storage receipt for the customer (letterhead,
  vehicle, set, depths with status, place, day, two signature lines); the hint about worn tyres is
  ticked when there is one and can be left out. Both from the set ("Etiketten", "Einlagerungsschein")
  and right after storing. Not yet: the QR code (nice to have) and a single-label printer (a format
  of 1 × 1 on its own page size later).
- [x] **13q – Tyre hotel ↔ task** (FB-06, FB-07)
  Done: the tire block of the task sheet is compact (69 instead of 105 mm, Loris 2026-10-15): one
  line per set – printed from the tyre hotel (season, kind, tyres, dimension, year), else to fill in
  once per set – the place big, and ONE table with the depths of both sets (the last measured
  printed small to compare). On the task a card "Pneuhotel" and the page "Radwechsel buchen"
  (`/tasks/:id/tires`, `POST /api/tasks/{id}/tires`): the set mounted is measured and retrieved,
  the one taken off stored – a new set, or the set retrieved last season stored again (same tyres,
  one history: `TireSet.storeAgain`). Proposed is the swap onto the place just freed. The history
  keeps the task (`tire_set_event.task_id`, V36; one stored and one retrieved per task). Marking
  a task "Fertig" with wheels still in the hotel asks to book (or later). Not automatic on "Fertig":
  the status is also set on the dashboard, where no depths can be entered.

Answers of the workshop (2026-10-14):

1. `Pneuhotel.xlsx` is the export from SwissGarage for the one-off import (FB-07).
2. The MFK slot (FB-10) is a hint only – it does not occupy anybody in the planning.
3. Suppliers (FB-09) get a page of their own in the navigation.
4. The quantity in the stock list (FB-08) is a number.

Decided: FB-05 times for everything except vacation (Loris 2026-10-14). Still open:
DOT per wheel (feedback) or only the year (UI concept) – assumed: the newer concept; the mockups
the concept mentions are not in the folder.

---

## Phase 14 – Third test round of the workshop (10/2026)

Eleven tickets FB-11 … FB-21 (rounds 2 and 3, 2026-10-19/20). Plan per ticket and questions on
2026-10-21; the workshop's answers (2026-10-22) are binding:

1. The to-do of "Bestellen durch" is done when the part is **ordered**.
2. Everything goes on one shopping list (also without a task); "Bestellen durch" may stay empty
   (no to-do, "nicht zugewiesen").
3. The block "Ersatzteilbestellungen" replaces the text field "Material bestellen" – existing texts
   are kept (as positions or notes).
4. "Radschrauben beachten" replaces "Radschrauben dabei": the bolts stay in the car, special ones
   must be looked for. The old meaning is dropped (also on the receipt).
5. Torque and pressure are kept **per set** – summer and winter wheels may differ.
6. Age of the tyres: green below 8 years, orange from 8, red from 10; the year is enough, a DOT
   code is optional (the year is derived from it). Independent of the tread traffic light.
7. No "eilt" (FB-16).

Order: small ones first, then the P1 shopping list, planning, tyres.

- [x] **14a – Torque, pressure, "Radschrauben beachten"** (FB-11, FB-17)
  Done: a set keeps the torque of the wheel bolts (Nm) and the pressure front/rear (bar, comma or
  point) – all optional, shown on the set, the receipt and the task sheet (printed when known,
  else lines to fill in). A new set gets them proposed from the newest set of the same car (the
  same season first) – when storing and when booking a tyre change. The check box is now
  "Radschrauben beachten": on the task sheet a framed warning with the set's remark, on the
  receipt a line; "Radschrauben" is no longer listed as stored.
- [x] **14b – "Wartet auf Material" in "Ohne Termin"** (FB-15)
  Done: "Ohne Termin" has a group "Wartet auf Material" on top – orders waiting without a day and
  those whose day is over (they went under on that day; `GET /api/tasks/waiting-for-parts`). Planned
  again for a day from today on, or another status = gone from the group. Each says what is missing
  (the parts text until 14c/14d) and when its day was; parts arrived = first, "jetzt einplanen".
  Dashboard and the button count both: "2 ohne Termin · 1 wartet auf Material".
- [x] **14c – Shopping list rebuilt** (FB-20)
  Done: the shopping list has positions of their own (`/api/shopping-items`, V42) instead of to-dos
  with a flag: description, number, quantity, state (to order / ordered / arrived), recorded by, to
  be ordered by – the quick entry above the list has exactly these six, Enter saves. ONE list, not
  by person; filter with/without task, "Liste | Nach Lieferant" (FB-09 with "Bestellung kopieren")
  and "Offen | Erledigt" (= arrived). Each position has a page (`/shopping/:id`) with article,
  supplier, ordered and expected on, and its history: notes with who and when, and every change of
  state. "Bestellen durch" gets a to-do linked to the position ("Bestellen: 2× …"): done once
  ordered and back; ticking it off or giving it to someone else changes the position too. The old
  shopping to-dos were taken over (open with a person: their to-do stays, linked; ticked off =
  arrived); to-dos have no shopping flag any more. The material written into tasks follows in 14d.
- [x] **14d – Parts block on the task** (FB-19)
  Done: the task page has "Ersatzteilbestellungen" – its positions of the shopping list, edited and
  deleted in place, and the quick entry with the same six fields, linked to the task by itself;
  "✓ Alle Teile geliefert" when everything arrived. Right after saving a new task the same block
  ("Ersatzteile bestellen"). The task's own "Material bestellen" goes (wizard tick, field, the box
  "Material für Aufträge"): V43 takes each text over as a position (state and day of order as
  they were, a supplier of the list linked by name, any other as a note). "Ohne Termin" says what
  is missing from the positions; the task sheet prints them with the work; the task search finds
  a task by its parts.
- [x] **14e – Where the vehicle is** (FB-16)
  Done: a task says where its vehicle is – "Beim Kunden" (new ones) or "Bei uns" (V44: tasks in work
  or waiting for parts are here). One tap in the wizard, on the task and in "Ohne Termin" (no
  version, like the status). "Ohne Termin" filters "Beim Kunden – aufbieten | Bei uns" with counts;
  with the customer the phone numbers are links to tap; "Jetzt aufbieten" marks a car with the
  customer whose parts are all here (FB-15); "In Arbeit" moves the car here. No call log yet (optional in FB-16, also wished in
  FB-21 – one for both later).
- [x] **14f – Unfinished tasks carried over** (FB-14)
  Done: a task received or in work whose appointment is over is carried over to the following days
  – computed, not moved (`GET /api/tasks/carried-over?day=`): no nightly job, the appointment stays
  as it was and says since when ("verlängert seit Mo 12.10."), so no history entry is needed. Shown
  in "Ohne Lift" without time and duration – in the day view a row above its time grid, on the
  dashboard/TV, and in the week with today; up to today only. It leaves when it is "Fertig" or
  planned again (open it, "Einplanen / Bearbeiten"). Waiting for parts is not carried (14b shows
  those). Not done: dragging it from there onto a lift – open it and plan it instead. As specified
  by the workshop "Eingang" counts too – also a car that never came: such a task is set "Fertig"
  or planned again. Computed means a past day shows today's state (finished ones are gone there too).
- [x] **14g – Week view in the wizard** (FB-13)
  Done: "Tag | Woche" above the planning grid of the wizard (new and edit). The week is the one of
  "Termine › Woche" (WeekView, only to look at, the days sharing the narrow width): tasks with time,
  lift, customer, plate and status, absences. A day opens its time grid right away – lift and time
  are taken there as before; the form stays as it is. No load indicator, no "next free slot"
  (as decided by the workshop).
- [x] **14h – Tyres without the hotel** (FB-12, part 1)
  Done: a set belongs to its vehicle and has a state – in the hotel (with its place), mounted, or with
  the customer (V45; a set never stored has no day stored). "Radwechsel buchen" records every change,
  hotel or not: put on – from the hotel, the customer's own set brought along again, or a new one they
  brought ("Reifendaten erfassen", same fields as storing, FB-11 values too); taken off – the one on
  the car or a new one, "Ins Pneuhotel" or "Nimmt der Kunde mit"; each with the depths from the sheet.
  New history steps: recorded, mounted (brought), taken home. The hotel's lists stay the hotel's
  (in the hotel / retrieved from it); the set page says where a set is.
- [x] **14h-2 – Tyres of a vehicle** (FB-12, part 2)
  Done: "Reifen" of a vehicle – per season the set used last (older ones counted): where it is (in
  the hotel with its place, mounted, with the customer), the last depth with the day it was measured
  (new `measuredOn`), the year with the age – a light for the tread (the limits of FB-07) and one for
  the age (below 8 years fine, from 8 orange, from 10 red) side by side. Shown in the wizard under
  "Arbeiten" for the chosen vehicle and with each vehicle on the customer page. "Jahrgang oder DOT":
  a DOT code ("2321") gives its year.
- [x] **14i – "Termin abmachen" from the tyre hotel** (FB-18)
  Done: "Termin abmachen" on a set's page and "Termin" per row of the hotel lists open the wizard
  with the set's customer and vehicle (straight to step 2; without vehicle step 1 first) and the
  tyre change ticked – "eingelagert" from the hotel, "mitgebracht" when it lies at the customer's,
  open for a set on the car. Under "Radwechsel" a hint lists open tyre changes of the vehicle on
  other days (wizard and edit page), the links open in a new tab.
- [x] **14j – Season change overview** (FB-21)
  Done: tab "Saisonwechsel" in the tyre hotel, computed by the backend (`GET /api/tire-season`).
  The season shown is the one whose deadline (1 June summer, 1 December winter – changeable in the
  settings, `tire_season_settings`, V46) is nearest: so the winter change is shown from September and
  still about three months after 1 December, when "Offen" becomes "Vergessen". A change counts from
  the other season's deadline on (the old set stored / taken home, or the new one retrieved /
  mounted). Per set: Offen (phone to tap, "Termin abmachen"), Termin geplant (open task with tyre
  change), Länger nicht abgeholt (in the hotel through a deadline of its own season), Quittiert
  (`tire_season_ack`: reason, who, when – for that deadline only, undoable), Gewechselt (folded).
  Counters at the top, "Beide Sätze eingelagert – prüfen", all-season sets left out, the hotel's
  search narrows it. Not built: the call log ("angerufen am … / Rückruf").
- [x] **14k – UX pass on laptop, tablet and TV** (wish of the user, 2026-10-23)
  Done: every page and dialog checked at 1366×768, 1024×768 and 1920×1080 (TV).
  - TV dashboard fills the screen without scrolling: the lists show what fits (`FittingList`, "+ n
    weitere"), week rows one line each, today per lift and the pinboard one above the other,
    the status legend next to the heading.
  - Termine: all lifts without scrolling sideways (narrower minimum, the whole width), the time of
    a narrow block a size smaller; week days never wider than their column; the list fits a laptop.
  - Equal heights: the cards of a row on the task page, the tyre set page; dashboard cards with
    the same lines. Names no longer broken in the middle of a word (`overflow-wrap: break-word`).
  - Pinboard and to-dos: six columns on a laptop, three per row on a tablet.
  - Navigation wraps on a tablet instead of hiding "Einstellungen"; a new page starts at its top
    (`ScrollRestoration`), links into the settings jump to their section.
  - Dialogs: one scrollbar, no box inside the dialog; the courtesy car form gets the whole width;
    "Drucken" menu on the set page; taken colours show the person's initials; customer page in cards.
- [x] **14l – UX leftovers of 14k** (wish of the user, 2026-10-24)
  - TV dashboard on a weekend, a holiday or while loading: "Heute da" is missing then, and every
    area moved up one grid row – the week took its whole height, today and the pinboard were
    squeezed to a strip. Title and "Heute da" are one block now, the rows stay.
  - "Ohne Lift" on the TV: the carried-over tasks were one item – "+ 1 weitere" for 40 tasks. Each
    task is an item now (`CarriedOverItem`), "+ n weitere" counts tasks.
  - Week view on a tablet with six or seven days: the plate shrinks with its card
    (`LicensePlate size="fit"`, container query) instead of losing its coat of arms at the edge.
  - Employee calendar: every bar has its category's symbol (`CategoryIcon`, also in the legend); a
    bar of one day shows only the symbol instead of "K…".

---

## Phase 15 – Extras (10/2026)

- [x] **15a – Statistics page** (wish of the user, 2026-10-25: "alle möglichen Statistiken, egal ob
  funny oder informativ")
  - New page "Statistik" in the main navigation; `GET /api/statistics` counts everything on the server
    (plain SQL, `StatisticsRepository`), read only, no new table.
  - Sections tasks, vehicles, customers, tyre hotel, team, material: big numbers, rankings (bars),
    charts by month, weekday and hour, shares (status, season, fuel …), a jump bar at the top.
  - "Schon gewusst?": fun facts built from the numbers – kilometres around the earth and to the moon,
    the queue of all vehicles, the tower of tyres, the record day, the oldest vehicle … – only those
    the data allows.
  - Absences only as a team total – nobody's sick days on a page for everyone. Free text (make,
    colour, city) is counted case-insensitively.

---

## Phase 16 – Fourth test round of the workshop (10/2026)

Rounds 4–6 of Reto's feedback (FB-22 … FB-33). Tickets that need an answer first (FB-22 whiteboard,
FB-23 storage codes, FB-24 parts in step 2, FB-29 lock on the tablet) wait for it.

- [x] **16a – SwissGarage holders** (FB-27)
  Done: 127 of 3693 vehicles of the export had no holder – the address list import takes only
  "Garage-Kunde" that is not blocked, but SwissGarage has vehicles whose holder has an empty address
  kind, is blocked/former or a supplier. Now a vehicle is always found with its SwissGarage holder:
  the vehicle list import creates a holder it does not know from the address on the vehicle (same
  address number = same customer, so two sites of a company stay two customers) and activates a
  deactivated one; the address list import keeps holders of active vehicles whatever their kind,
  updates them and never deactivates them. Vehicles still without holder (no address number, no
  name) are listed one by one with the reason. A new holder was not seen as a change when the vehicle
  had none ("unchanged") – saved right away now.
- [x] **16b – Parts entry fits its place** (FB-26)
  Done: the six fields of the quick entry follow the width they have (container query), not the
  window's – the card "Auftrag gespeichert" is narrow on a wide screen, the fields ran out of it.
  Narrow: description, number, quantity in one row, the three selects in the next; with room all
  six in one row; very narrow one per line. The card keeps a wide child inside its frame.
- [x] **16c – More states of an order** (FB-28)
  Done: zu bestellen, Offerte angefragt, Rückfrage – wir liefern Infos, Offerte erhalten – entscheiden,
  bestellt, geliefert, storniert (V47; the old ones keep their state). Each line says who is up – "wir
  sind dran" or "wartet auf Lieferant" – the open list counts both; a Rückfrage nobody orders stands
  out. Cancelled goes to "Erledigt", struck through, keeps its day of order and is not missing on
  the task. A change of state on the position's page takes a short note for the history.
  The to-do of "Bestellen durch" is open exactly while we are up and says what to do ("Bestellen: …",
  "Infos an Lieferant liefern: …", "Offerte prüfen: …"); while the supplier is up it is done – a
  deliberate change to the wish "bleibt offen bzw. wartet": the to-do list shows only what someone
  has to do. Ticking off a Rückfrage gives it back to the supplier (Offerte angefragt), any other
  orders it; undoing goes back to where we were up last (from the history). "Wir sind dran" without
  "Bestellen durch" stands out – nobody has a to-do for it. A task's parts count as arrived when
  nothing is open and something arrived – the same rule on the task and in "Ohne Termin".

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
