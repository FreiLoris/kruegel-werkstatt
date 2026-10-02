-- Erste Migration: legt noch keine Tabellen an.
-- Sie stellt sicher, dass Flyway läuft und seine Verwaltungstabelle
-- "flyway_schema_history" erstellt.
--
-- Regeln für Migrationen:
--   * Dateiname: V<Nummer>__<beschreibung>.sql  (zwei Unterstriche!)
--   * Eine Migration wird nach dem Merge NIE mehr geändert –
--     Änderungen am Schema immer als neue Datei (V2, V3, ...).

SELECT 1;
