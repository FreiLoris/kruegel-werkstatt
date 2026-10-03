-- Nur für Tests: neue Pflichtspalten aus BaseEntity (siehe V3__aenderungen_nachvollziehbar.sql).

ALTER TABLE test_entity
    ADD COLUMN erstellt_von  uuid,
    ADD COLUMN geaendert_von uuid;
