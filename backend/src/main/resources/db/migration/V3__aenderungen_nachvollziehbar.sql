-- Wer hat einen Datensatz angelegt / zuletzt geändert? (Bug #11: keine Nachvollziehbarkeit)
-- Leer bei Testdaten und Ersteinrichtung. Ab jetzt hat jede Tabelle diese zwei Spalten (siehe BaseEntity).

ALTER TABLE mitarbeiter
    ADD COLUMN erstellt_von  uuid REFERENCES mitarbeiter (id),
    ADD COLUMN geaendert_von uuid REFERENCES mitarbeiter (id);
