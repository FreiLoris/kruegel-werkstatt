-- Nur für Tests: Tabelle zur Test-Entität, mit der BaseEntity geprüft wird.
-- Hohe Versionsnummer, damit sie nie mit echten Migrationen kollidiert.

CREATE TABLE test_entity (
    id            uuid         PRIMARY KEY,
    version       bigint       NOT NULL,
    erstellt_am   timestamptz  NOT NULL,
    geaendert_am  timestamptz  NOT NULL,
    name          text         NOT NULL
);
