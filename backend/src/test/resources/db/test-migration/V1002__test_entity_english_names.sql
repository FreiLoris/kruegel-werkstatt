-- Test only: English column names from BaseEntity (see V6__english_names.sql).

ALTER TABLE test_entity RENAME COLUMN erstellt_am   TO created_at;
ALTER TABLE test_entity RENAME COLUMN geaendert_am  TO updated_at;
ALTER TABLE test_entity RENAME COLUMN erstellt_von  TO created_by;
ALTER TABLE test_entity RENAME COLUMN geaendert_von TO updated_by;

-- PostgreSQL 18 names NOT NULL constraints too; renaming a column does not rename them.
ALTER TABLE test_entity RENAME CONSTRAINT test_entity_erstellt_am_not_null  TO test_entity_created_at_not_null;
ALTER TABLE test_entity RENAME CONSTRAINT test_entity_geaendert_am_not_null TO test_entity_updated_at_not_null;
