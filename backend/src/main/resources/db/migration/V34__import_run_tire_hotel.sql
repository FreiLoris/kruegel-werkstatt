-- The one-off import of the SwissGarage tyre hotel (FB-07) is logged like the other imports.
ALTER TABLE import_run
    DROP CONSTRAINT import_run_kind_check,
    ADD CONSTRAINT import_run_kind_check CHECK (kind IN ('CUSTOMERS', 'VEHICLES', 'TIRE_HOTEL'));
