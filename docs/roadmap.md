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
  (`latest` + commit tag); `deploy/nas/compose.yaml` only pulls them (no default password, no
  open DB port, `pull_policy: always`); the backup scripts are in their own image. Guide for the
  NAS steps: [`deployment-nas.md`](deployment-nas.md). NAS: DS224+ (Intel), 2 GB RAM.
  Done 2026-10-07: project `kruegel-werkstatt` in Container Manager, all four containers running,
  app answers on port 8090. Lesson: Container Manager shows no error text – the first start
  failed with `manifest unknown` because of a typo in `APP_VERSION` in `.env`.
- [ ] **11e – Go-live**
  Checklist: own DB password in `.env`, SwissGarage import of both Excel files, create Reto
  (Geschäftsführung) and the team, set up the TV as "Nur ansehen", first backup checked,
  switch off the old app.

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
  bottom bar stays on one line; the suppliers (13e) become a third tab.
- [ ] **13e – Suppliers** (FB-09): own page (tab under "Material"), article ↔ supplier n:m with the
  supplier's article number, filter of the stock list by supplier.
- [ ] **13f – Shopping list ↔ stock and suppliers** (FB-08 nice to have, FB-09): entry with an
  optional article and a supplier (taken from the article), grouped by supplier, "Auf Einkaufsliste".

Answers of the workshop (2026-10-14):

1. `Pneuhotel.xlsx` is the export from SwissGarage for the one-off import (FB-07).
2. The MFK slot (FB-10) is a hint only – it does not occupy anybody in the planning.
3. Suppliers (FB-09) get a page of their own in the navigation.
4. The quantity in the stock list (FB-08) is a number.

Still open: FB-05 with clock times also for "Ferien" (the vacation statistics count half days);
DOT per wheel (feedback) or only the year (UI concept) – assumed: the newer concept; the mockups
the concept mentions are not in the folder.

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
