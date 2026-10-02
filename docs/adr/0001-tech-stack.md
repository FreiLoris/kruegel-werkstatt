# ADR 0001 – Technologie-Stack

- **Status:** Angenommen
- **Datum:** 2026-10-02

## Kontext

Die bestehende Werkstatt-App besteht aus einem Node.js-Server und einer einzigen HTML-Datei
(~5800 Zeilen). Daten liegen als JSON-Blobs in SQLite, ohne Schema und ohne Beziehungen.
Das führt zu Fehlern wie doppelt buchbaren Ersatzwagen und schwer wartbarem Code
(Details: [`docs/analyse/TIEFENANALYSE_NEUBAU.md`](../analyse/TIEFENANALYSE_NEUBAU.md)).

Rahmenbedingungen:

- Betrieb auf Synology DS224+ (Intel x86, 4 Kerne, 2 GB RAM) mit Docker.
- Nur internes Netzwerk, kein Login, keine Offline-Fähigkeit nötig.
- Mehrere Geräte gleichzeitig (PCs, Tablets, TV) – Änderungen sollen live erscheinen.
- Wartung durch einen Junior-Java-Entwickler → Verständlichkeit vor Raffinesse.

## Entscheid

| Bereich | Wahl |
|---|---|
| Datenbank | **PostgreSQL** |
| Backend | **Java 25 + Spring Boot 4**, Build mit **Maven** |
| DB-Migrationen | **Flyway** (Schema nur über versionierte SQL-Skripte) |
| Frontend | **React + TypeScript mit Vite**, ausgeliefert als statische Dateien über **nginx** |
| Live-Updates | **Server-Sent Events (SSE)** |
| Betrieb | **Docker Compose** mit drei Containern: `frontend`, `backend`, `db` |

## Begründung

**PostgreSQL statt MongoDB.** Die Daten sind klar relational (Auftrag → Kunde, Fahrzeug,
Mechaniker, Ersatzwagen). Fast alle Abfragen sind Zeitraum-Abfragen (Kalender, Kapazität,
Verfügbarkeit). Fremdschlüssel und Constraints verhindern genau die Fehler der alten App –
z. B. kann eine Doppelbuchung eines Ersatzwagens direkt in der Datenbank ausgeschlossen werden.

**React + Vite statt Next.js.** SEO und Server-Side-Rendering bringen in einem internen Tool
keinen Nutzen. Next.js würde einen zusätzlichen Node-Server zum Betreiben bedeuten – also
zwei Backends. Ein statischer Build in nginx ist einfacher, braucht kaum RAM, und nginx
leitet `/api` an das Backend weiter (eine URL, keine CORS-Probleme).

**SSE statt WebSocket/STOMP.** Geschrieben wird über normale REST-Aufrufe. Der Server muss
den anderen Geräten nur mitteilen „hat sich geändert". Dafür reicht eine Einweg-Verbindung;
SSE ist einfacher als STOMP und braucht keine zusätzliche Bibliothek im Browser.

**Maven statt Gradle.** Deklarativ und gut dokumentiert – für den Einstieg leichter lesbar.

## Konsequenzen

- RAM ist knapp: Container bekommen feste Speicherlimits (Postgres ~150 MB, Backend ~350 MB).
- Ohne Login hat jedes Gerät im Netz vollen Zugriff. Die Struktur bleibt so, dass ein Login
  später ohne Umbau ergänzt werden kann.
- Lokale Entwicklung und NAS sind beide x86 → Docker-Images laufen ohne Anpassung auf dem NAS.
