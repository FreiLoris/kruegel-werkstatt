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
- [ ] **5c – Import address list (server side)**
  Excel upload to the backend, filter "garage customer"/not blocked, update instead of
  replacing everything, import log (date, number new/changed).
- [ ] **5d – Import vehicle list**
  Assign vehicles to the customer, convert Excel date values (MFK) correctly.
- [ ] **5e – Customer search API**
  Search by name, company, license plate; hits with vehicles.
- [ ] **5f – Import page**
  Upload, preview (loads reliably → F4), "last imported on …", delete in a danger zone.

## Phase 6 – Tasks & appointments

Core of the app, therefore split more finely. ("Task" = Auftrag/Termin, see glossary.)

- [ ] **6a – Task data model**
  References customer/vehicle/mechanic/lift; status as enum (received, in progress, waiting for
  parts, done) and **waiting customer as a separate flag** (→ bug #4, status/flag mix-up);
  arrives earlier / ready by; tire change, MFK, service items, parts incl. supplier;
  task number (external, optional); order per lift/day.
- [ ] **6b – Task API**
  Create, edit, change status, add task number, delete (with "changed by").
  Optimistic locking on concurrent edits.
- [ ] **6c – Wizard step 1: customer & vehicle**
  Customer search (bigger hit list), placeholders clearly placeholders, MFK-expired warning,
  customer history on the right instead of an empty area.
- [ ] **6d – Wizard step 2: appointment & work**
  Sensible defaults (arrives earlier = evening before), capacity overview sticky,
  click on a slot takes over date + time, buttons not cut off.
- [ ] **6e – Wizard step 3/4 + task sheet**
  Clear "saved" confirmation; print with Krügel letterhead, white paper layout,
  **all ticked work on the sheet** (→ F1), customer address.
- [ ] **6f – Appointments: day view by lift**
  Cards with mechanic + courtesy car symbol, drag & drop between lifts and within the
  column – the order is saved for **all** affected tasks (→ bug #5).
- [ ] **6g – Appointments: week view**
  Drag & drop onto a date, absences visible, search over all appointments instead of only the
  current week (→ F11). Optional: take over the time when moving (→ bug #6, dead feature).
- [ ] **6h – Task detail**
  View as readable text (no fake form), edit as form with sticky footer,
  customer/vehicle data editable, create note/to-do directly, correct label "Mechaniker".
- [ ] **6i – Task list**
  Sortable columns, filters (status, period), work column complete (→ F1),
  status colors from **one** central definition (→ F10), delete only with confirmation.

## Phase 7 – Courtesy car bookings

- [ ] **7a – Booking data model**
  One table for all bookings (with or without task). The database prevents
  overlapping bookings of the same car (exclusion constraint). (→ bug #2, F2)
- [ ] **7b – Availability & booking API**
  One single availability check for wizard, task and courtesy car page. Record the return.
- [ ] **7c – Booking in a task**
  Selection in wizard/task with an understandable availability table.
- [ ] **7d – Courtesy car page**
  Cards with correct status, occupancy calendar (free/booked clearly visible),
  drag booking, period changeable in the panel (→ F12).

## Phase 8 – To-dos & pinboard

- [ ] **8a – To-do data model & API**
  Person as reference (instead of name), deadline, shopping list flag, reference to task/note
  by ID instead of task number text (→ bug #14).
- [ ] **8b – To-do page**
  Person filter from the employee list (→ bug #3), active filter recognisable,
  own tab shopping list, done only via checkbox with "undo" (→ F5).
- [ ] **8c – Note data model & API**
  Multiple assignment, reference to task (→ F8), sub-tasks are to-dos only
  (no second list → bug #10), archiving completes linked to-dos, reactivating symmetric.
- [ ] **8d – Pinboard page**
  Columns from the employee list (→ bug #3), same order as dashboard, drag between
  columns, detail modal (large text field, visible save), archive with search.

## Phase 9 – Absences & employee calendar

- [ ] **9a – Absence data model & API**
  Category as enum (vacation, sick, external work + company, training) (→ bug #1).
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
