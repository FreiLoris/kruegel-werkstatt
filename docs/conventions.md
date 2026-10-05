# Conventions

Binding rules for code and database. Goal: every module looks the same –
whoever understands one understands all of them.

## Language

| What | Language | Example |
|---|---|---|
| Code: classes, fields, methods, tests, files | **English** | `Employee`, `createdAt`, `EmployeeService`, `rejectsInvalidColor()` |
| Database: tables, columns, constraints | **English**, `snake_case` | `employee`, `vacation_days_per_year` |
| API: paths, JSON fields, live topics | **English** | `/api/service-items`, `includeInactive`, `errors[field, message]` |
| Comments, Javadoc, docs, commit messages | **English** | |
| **Everything the user sees** | **German** | UI texts, toasts, validation and error messages, `title`/`detail` of Problem Details |

Domain terms are translated **only** as listed in the [glossary](glossary.md)
(e.g. Auftrag → `Task`, Ersatzwagen → `CourtesyCar`, MFK → `mfk`). New term → add it there first.
Why English: [ADR 0002](adr/0002-english-code.md).

## Backend structure: one package per business area

```
ch.kruegel.workshop
├── common/              shared things (base classes, configuration)
│   ├── config/
│   ├── live/            live updates (SSE)
│   ├── person/          "Who am I?" per device
│   ├── persistence/     BaseEntity, SortOrder
│   └── web/             error handling
├── employee/            ← everything about employees in one place
│   ├── Employee.java              entity
│   ├── EmployeeRepository.java    database access
│   ├── EmployeeService.java       business logic
│   ├── EmployeeController.java    REST API
│   └── EmployeeDto.java …         API input/output
└── lift/, serviceitem/, …
```

- **Controller**: HTTP only (accept request, call service, return response). No logic.
- **Service**: business rules and transactions (`@Transactional`).
- **Entity**: data + rules that only concern the object itself (e.g. checking a status change).
- **DTOs**: the API never returns entities, always its own records.
- `common` never depends on a business module. If it needs something from one, it defines an
  interface that the module implements (example: `PersonDirectory` ← `EmployeePersonDirectory`).

## Frontend structure

```
frontend/src/
├── main.tsx            entry: router + TanStack Query
├── app/                app-wide: router, layout, navigation, error pages, QueryClient, live, person
├── api/                client.ts (typed API access), schema.d.ts (generated), errors.ts
├── components/         ui/ (basic components), masterdata/ (simple master data lists)
├── lib/                general helpers (format.ts, sortOrder.ts, devicePerson.ts)
└── features/           ← one folder per business area, named like the API topic
    ├── employees/
    │   ├── EmployeesPage.tsx       page (bound to a route)
    │   ├── EmployeeForm.tsx        components
    │   └── employeeApi.ts          queries/mutations of this area
    └── …
```

- **Pages** are called `…Page.tsx` and are mapped to a URL in `app/router.tsx`.
  Also add new pages to `app/navigation.ts`. Print views (task sheet) are routes outside `AppLayout`.
- **Server data only through TanStack Query** (`useQuery`/`useMutation`), never with your own
  `useEffect` + `fetch`. Query functions return `dataOrThrow(await api.GET(…))`.
- **API errors** are always `ApiError` (`api/errors.ts`) – with `messageForField()` for forms
  and `isConflict` for 409.
- **Date/time** only displayed through `lib/format.ts` (`formatDate`, `formatTime`,
  `formatTimestamp`). Never `new Date("2026-10-15")` for business dates.
- **Tests** (Vitest) live next to the file: `format.ts` → `format.test.ts`.

## Live updates

When a device changes data, all other open browsers reload the affected data immediately.

```
Service saves ─▶ publishEvent(new DataChanged("employees")) ─▶ to all browsers after commit
Browser receives { topic: "employees" } ─▶ invalidateQueries(['employees']) ─▶ reloads
```

- **Backend:** every service that changes data then publishes `DataChanged` with its topic.
  It is sent automatically only after a successful commit.
- **Frontend:** the **first part of every query key is the topic** – exactly the same text as
  in the backend: `['employees']`, `['employees', id]`. Otherwise changes do not arrive.
- Topic names: same as the API path (`employees`, `lifts`, `service-items`).

## Who am I? (person per device)

No login – every device chooses a person once, or "view only" (workshop TV).

```
Device chooses person ─▶ localStorage ─▶ header X-Person on every request (api/client.ts)
Backend: PersonInterceptor checks ─▶ auditing fills createdBy/updatedBy
         change (not GET) without active person ─▶ 403 (except: no employees at all yet)
```

- **Backend:** nothing to do – `BaseEntity` + interceptor handle it for every module.
  `…Dto` also returns `updatedAt` and `updatedBy`.
- **Frontend:** only show edit buttons if `useCanEdit()` is true.
  Take the name for `updatedBy` from the employee list.
- Protection against mistakes, not against intent (the header can be forged) – on purpose (bug #11, ADR 0001).

## UI components & design

Overview of all components with examples: http://localhost:5173/system/components

| Component | File | Usage |
|---|---|---|
| Button | `components/ui/Button.tsx` | `variant` primary/secondary/danger/ghost, `icon`, `loading` |
| Input fields | `components/ui/Fields.tsx` | `TextField`, `TextArea`, `Select`, `Checkbox` – always with `label`, errors via `error` |
| Modal | `components/ui/Modal.tsx` | buttons in `footer` (stays visible), Esc/backdrop closes; initial focus via `data-autofocus` (never `autoFocus`) |
| Toast | `useToast()` | `toast.success('…')`, `toast.error('…')` |
| Confirm | `useConfirm()` | `if (await confirm({ title, text, dangerous: true })) …` – never `window.confirm()` |
| Menu | `components/ui/Menu.tsx` | dropdown menu, closes on Esc/click outside |
| Name badge | `features/employees/NameBadge.tsx` | a person's name on their color, text color automatic – use wherever people appear |
| Master data list | `components/masterdata/MasterDataList.tsx` + `NameDialog.tsx` | simple master data (name + order only, e.g. lifts, service items): list with ↑/↓, rename, deactivate |
| License plate | `components/licenseplate/LicensePlate.tsx` + `LicensePlateField.tsx` | Show plates always as `<LicensePlate text=…>` (Swiss plate with coat of arms); input always with `LicensePlateField`. Stored as one text, normalised by `common/LicensePlates` |

- **No fixed colors/spacing** in CSS – only variables from `styles/tokens.css`
  (`--color-*`, `--space-*`, `--font-*`, `--radius-*`, `--layer-*`).
- **CSS per component** as a CSS module (`Button.module.css`) – class names only apply there.
- **Icons** from `lucide-react`, with `aria-hidden` when there is text next to them.
- **Everything clickable at least 44 px high** (`var(--touch-min)`) – tablets.
- **Font and icons are local** in the build – the app needs no internet.

## Entities

- Extend `BaseEntity` → automatically `id` (UUIDv7), `version`, `createdAt`, `updatedAt`,
  `createdBy`, `updatedBy`.
- No public setter for everything: changes through meaningful methods
  (`task.changeStatus(...)` instead of `setStatus(...)`).
- No-arg constructor only `protected` (only needed by JPA).

## Database

- Schema **only through Flyway**: `backend/src/main/resources/db/migration/V<n>__<description>.sql`.
- A merged migration is **never** changed again – not even a comment (Flyway checksum).
  Corrections as a new migration.
- Table and column names: `snake_case`, singular (`task`, `courtesy_car_booking`).
- Required columns of every table (matching `BaseEntity`):
  ```sql
  id          uuid         PRIMARY KEY,
  version     bigint       NOT NULL,
  created_at  timestamptz  NOT NULL,
  updated_at  timestamptz  NOT NULL,
  created_by  uuid         REFERENCES employee (id),
  updated_by  uuid         REFERENCES employee (id)
  ```
- Relations always with a foreign key (`REFERENCES …`), rules preferably as constraints.
- Hibernate never creates tables (`ddl-auto: validate`).
- Real initial master data (e.g. the three lifts) may be inserted by a migration – sample data may not.

## API design (template: module `employee`)

| What | Rule |
|---|---|
| Output | `…Dto` record, e.g. `EmployeeDto`. **Always contains all fields** (empty ones as `null`) and the `version`. Entities never leave the backend. |
| Input | `…Request` record with Bean Validation. **Flat** – the same for create and edit; when editing additionally `version`. Exception: a group that is optional as a whole may be a nested record (`TaskRequest.Parts`). |
| Required vs. optional input | Jackson 3 refuses a missing value for `boolean`/`int`. Primitive = required, mark it `@Schema(requiredMode = REQUIRED)` (`EmployeeRequest`). Optional tick = `Boolean`, normalised to `false` in the compact constructor (`TaskRequest`). |
| Create | `POST /api/<topic>` → **201** with `Location` header |
| Edit | `PUT /api/<topic>/{id}` with `version` → 409 for a stale state |
| Delete | Master data other data refers to is **deactivated** (`POST …/{id}/deactivate`), not deleted |
| Delete (other data) | `DELETE /api/<topic>/{id}` → **204**, logged with the person (e.g. tasks) |
| Rule needs the database | check in the service and `throw new InvalidInputException("field", "…")` → appears at the form field |
| Rule without a field | `throw new BusinessRuleException("Mindestens ein Lift muss in Betrieb bleiben.")` → 409, message appears as toast |
| Order | entity `implements Sortable`, in the service `SortOrder.reorder(allCurrent, ids, "Lift")`, endpoint `PUT …/order` |
| Check before change | check uniqueness **before** changing the entity – otherwise Hibernate writes the change to the database before the check query (auto flush) and you get 409 instead of a field error |
| After saving | `repository.flush()` (so the returned `version` is correct) and `publishEvent(new DataChanged(TOPIC))` |
| Tests | API test from the outside (`…ApiTest`, MockMvcTester), repository test, unit test for rules |

## API errors

All errors come as **Problem Details** (RFC 9457, `application/problem+json`),
created centrally in `GlobalExceptionHandler`. No controller builds its own error responses.

| Situation | In code | HTTP |
|---|---|---|
| Invalid input | Bean Validation on the DTO (`@NotBlank`, `@Size`, …) + `@Valid` | 400 with list `errors[]` (`field`, `message`) |
| No person selected | thrown by `PersonInterceptor` | 403 |
| Record missing | `throw new NotFoundException("Mitarbeiter", id)` | 404 |
| Edited at the same time | `entity.checkVersion(request.version())` in the service | 409 |
| Business rule | `throw new BusinessRuleException("…")` | 409 |
| Everything else | – (logged automatically) | 500, without technical details |

- Validation rules belong on the **DTO**, not on the entity.
- Update DTOs always contain the `version` the client loaded.
- Messages are German (locale fixed to `de`) – the user reads them.

## API contract (OpenAPI)

The backend describes its API automatically (springdoc). This description is the
contract between backend and frontend – the TypeScript types are generated from it.

```
Controllers/DTOs ──./mvnw test──▶ api/openapi.json ──npm run api:generate──▶ frontend/src/api/schema.d.ts
```

- After every API change: `./mvnw test` (backend) and `npm run api:generate` (frontend),
  commit both files. Otherwise CI fails.
- The frontend only calls the API through `src/api/client.ts` – never write API types by hand.
- View/try the API in the browser: http://localhost:8080/api/docs (Swagger UI).

## Time

| What | Java type | DB type |
|---|---|---|
| Point in time (when saved, done at …) | `Instant` | `timestamptz` |
| Business date (appointment on Oct 15) | `LocalDate` | `date` |
| Business time (at 08:00) | `LocalTime` | `time` |

- Current time **always** through the `Clock` bean: `LocalDate.now(clock)`, never `LocalDate.now()`.
- Application time zone: `Europe/Zurich` (`TimeConfig.TIME_ZONE`).
- JSON: ISO format (`2026-10-15`, `08:00:00`, `2026-10-15T06:00:00Z`). Formatting for
  humans (`15.10.2026`) is done exclusively by the frontend.

## Tests

- Against real PostgreSQL (Testcontainers), never H2.
- `@DataJpaTest` for database logic, `@SpringBootTest` for the whole app / API.
- Every test starts from a defined state (no dependency on the order).
  API tests empty the business tables with `TestDatabase.clear(jdbc)` – **add every new table there**.
- Time-dependent tests with `TestClock`.

## Sample data for development

- Only in the Spring profile `dev` (automatic with `./mvnw spring-boot:run`) – never in the Docker image/NAS, never in tests.
- Created in Java (`common/dev/DevSampleData.java`), **not** as a Flyway migration: the Flyway history
  only contains the real schema. Otherwise an installation without sample data would no longer start as
  soon as it meets a database with a recorded sample data migration.
- Only created when the table is empty – local changes are kept.

## Git

- One package from [`roadmap.md`](roadmap.md) = one branch = one pull request.
- Branch names: `feat/…`, `fix/…`, `refactor/…`, `chore/…`, `docs/…`, `ci/…`
- Commit messages in English.
- Merge only with green CI.
