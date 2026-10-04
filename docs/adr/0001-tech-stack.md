# ADR 0001 – Technology stack

- **Status:** Accepted
- **Date:** 2026-10-02

## Context

The existing workshop app consists of a Node.js server and a single HTML file
(~5800 lines). Data lives as JSON blobs in SQLite, without schema and without relations.
That leads to bugs such as double-bookable courtesy cars and hard-to-maintain code
(details, in German: [`docs/analysis/TIEFENANALYSE_NEUBAU.md`](../analysis/TIEFENANALYSE_NEUBAU.md)).

Constraints:

- Runs on a Synology DS224+ (Intel x86, 4 cores, 2 GB RAM) with Docker.
- Internal network only, no login, no offline capability needed.
- Several devices at the same time (PCs, tablets, TV) – changes should appear live.
- Maintained by a junior Java developer → understandability over sophistication.

## Decision

| Area | Choice |
|---|---|
| Database | **PostgreSQL** |
| Backend | **Java 25 + Spring Boot 4** (starting with 4.1.1), build with **Maven** |
| Database migrations | **Flyway** (schema only through versioned SQL scripts) |
| Frontend | **React + TypeScript with Vite**, served as static files by **nginx** |
| Live updates | **Server-Sent Events (SSE)** |
| Operation | **Docker Compose** with three containers: `frontend`, `backend`, `db` |

## Rationale

**PostgreSQL instead of MongoDB.** The data is clearly relational (task → customer, vehicle,
mechanic, courtesy car). Almost all queries are period queries (calendar, capacity,
availability). Foreign keys and constraints prevent exactly the bugs of the old app –
e.g. a double booking of a courtesy car can be ruled out directly in the database.

**React + Vite instead of Next.js.** SEO and server-side rendering bring no benefit in an
internal tool. Next.js would mean an additional Node server to operate – that is, two
backends. A static build in nginx is simpler, needs hardly any RAM, and nginx forwards
`/api` to the backend (one URL, no CORS problems).

**SSE instead of WebSocket/STOMP.** Writes go through normal REST calls. The server only has to
tell the other devices "has changed". A one-way connection is enough for that;
SSE is simpler than STOMP and needs no additional library in the browser.

**Maven instead of Gradle.** Declarative and well documented – easier to read when starting out.

## Consequences

- RAM is scarce: containers get fixed memory limits (Postgres ~150 MB, backend ~350 MB).
- Without login every device in the network has full access. The structure stays such that a
  login can be added later without rebuilding.
- Local development and the NAS are both x86 → Docker images run on the NAS without changes.
