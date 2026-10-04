# ADR 0003 – Customers and vehicles: own master data or import copy?

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The workshop runs **SwissGarage (C16)** as its business software: customers, vehicles,
invoices. The old app never kept its own customer database on purpose:

- A manual Excel export from SwissGarage (address list + vehicle list) was imported into the app
  and **replaced completely** on every import (no merge).
- That copy was used **only** to search and auto-fill in step 1 of the appointment wizard.
- Every task stored name, phone, license plate, … as **copied text**. There is no customer
  history, no "all tasks of this vehicle", and a wrong phone number has to be corrected on
  every single task. Walk-in customers that are not (yet) in SwissGarage exist only as text on
  their task.

The import is one-way: nothing is ever written back to SwissGarage. Whether SwissGarage offers
an interface (API, database access) is unknown – for now the Excel export is the only way.

Phases 5–6 build customers, vehicles and tasks. The data model depends on this decision,
and it is expensive to change once real data has been migrated (phase 11).

## Options

### A – Import copy only (like the old app, but clean)

`customer` and `vehicle` tables filled **only** by the import, read-only in the app.
SwissGarage stays the single source of truth. Tasks reference the imported record and keep a
text snapshot for walk-ins that are not in SwissGarage.

| + | − |
|---|---|
| No second truth, simple | Walk-ins never become real customers in the app |
| Import can simply overwrite | No correction in the app – a wrong phone number waits for the next export |
| | History only for customers that exist in SwissGarage |

### B – Own master data

The app owns customers and vehicles. The import creates and updates records; people can edit
everything in the app.

| + | − |
|---|---|
| Full history, corrections in one place | **Two truths**: a phone number changed in the app is overwritten by the next import – or the import has to be skipped for edited fields and both systems drift apart |
| Walk-ins are normal customers | More code: conflict rules, merge of duplicates |

### C – Hybrid: SwissGarage records + local records (recommended)

Both live in the same `customer`/`vehicle` tables, every record has a **source**:

- **SwissGarage** (key: SwissGarage address number / internal vehicle number): created and
  updated **only** by the import. In the app read-only. Records missing from a new export are
  deactivated, never deleted (tasks refer to them).
- **Local** (walk-ins, created in the app): fully editable. When such a customer later appears in
  SwissGarage, the import suggests linking the two (later, not in phase 5).

Tasks reference customer and vehicle **by ID** → history per customer and vehicle.
For the rare "phone number is wrong, customer waits on the phone" case a task gets its own
optional **contact note** (e.g. "heute erreichbar unter 079 …") instead of editing the
SwissGarage record.

| + | − |
|---|---|
| One truth per record – no conflicts with the import | Corrections of SwissGarage data still happen in SwissGarage |
| History and "all tasks of this vehicle" for everyone | Somewhat more model (source, key) than A |
| Walk-ins are real customers immediately | Duplicates local ↔ SwissGarage possible until linked |
| Import can update instead of replacing everything (log: new/changed/deactivated) | |

## Decision

**Option C – hybrid.**

The workshop confirmed that new customers are **created in SwissGarage first**, then the
appointment is made. SwissGarage is therefore current, and it stays the single source of
truth for its records. Local customers are the exception (e.g. a quick appointment for someone
not yet in SwissGarage).

Rules that follow from it:

- `customer` and `vehicle` have a `source`: `SWISSGARAGE` or `LOCAL`.
- SwissGarage records are keyed by their SwissGarage number (address number, internal vehicle
  number), created and updated **only** by the import and read-only in the app. Missing in a new
  export → deactivated, never deleted.
- Local records are created and edited in the app.
- Tasks reference customer and vehicle **by ID** (history per customer/vehicle). A task has an
  optional contact note for "today reachable at …" instead of changing a SwissGarage record.
- The import **updates** instead of replacing everything and writes a log (new / changed /
  deactivated).
- Linking a local customer to the SwissGarage record that appears later: not part of phase 5;
  rare given the workflow above, added when needed.

## Consequences

- Corrections of SwissGarage data are made in SwissGarage and arrive with the next import –
  the app shows a hint on read-only fields.
- Packages 5b–5f are built on this model (see roadmap).
- If SwissGarage ever offers an interface, only the import changes – the model stays.
