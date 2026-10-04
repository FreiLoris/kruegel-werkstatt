-- Log of every SwissGarage import: who imported which file when, and what happened.
-- The import page shows the last runs ("zuletzt importiert am …").

CREATE TABLE import_run (
    id           uuid         PRIMARY KEY,
    version      bigint       NOT NULL,
    created_at   timestamptz  NOT NULL,
    updated_at   timestamptz  NOT NULL,
    created_by   uuid         REFERENCES employee (id),
    updated_by   uuid         REFERENCES employee (id),

    kind         text         NOT NULL CHECK (kind IN ('CUSTOMERS', 'VEHICLES')),
    file_name    text         NOT NULL,
    rows_read    integer      NOT NULL CHECK (rows_read >= 0),
    -- Rows not imported on purpose (e.g. no garage customer, blocked) or because of a problem
    skipped      integer      NOT NULL CHECK (skipped >= 0),
    created      integer      NOT NULL CHECK (created >= 0),
    updated      integer      NOT NULL CHECK (updated >= 0),
    unchanged    integer      NOT NULL CHECK (unchanged >= 0),
    deactivated  integer      NOT NULL CHECK (deactivated >= 0),
    -- Problems per row, one per line (e.g. "Zeile 17: kein Name") – shown to the user
    problems     text
);

CREATE INDEX import_run_created_at ON import_run (created_at DESC);
