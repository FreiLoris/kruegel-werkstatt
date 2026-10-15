-- Inspection stations (FB-10): where a car goes for its MFK. Nearly always Winterthur-Wülflingen
-- (confirmed by the workshop) – it is created here as the standard, preset on new tasks.
-- No longer used ones are deactivated, not deleted – old tasks still name them.
CREATE TABLE inspection_station (
    id          uuid         PRIMARY KEY,
    version     bigint       NOT NULL,
    created_at  timestamptz  NOT NULL,
    updated_at  timestamptz  NOT NULL,
    created_by  uuid         REFERENCES employee (id),
    updated_by  uuid         REFERENCES employee (id),

    name        text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    address     text         CHECK (length(address) <= 200),
    phone       text         CHECK (length(phone) <= 40),
    -- there and back incl. the inspection: preset as the duration of the MFK appointment
    minutes     integer      NOT NULL CHECK (minutes BETWEEN 15 AND 480),
    is_default  boolean      NOT NULL,
    active      boolean      NOT NULL,
    -- the standard stays in use
    CHECK (active OR NOT is_default)
);

CREATE UNIQUE INDEX inspection_station_name_unique ON inspection_station (lower(trim(name)));
-- exactly one standard (at least one: kept by the app)
CREATE UNIQUE INDEX inspection_station_one_default ON inspection_station (is_default) WHERE is_default;

-- Address and phone are left to the workshop – nothing guessed here
INSERT INTO inspection_station (id, version, created_at, updated_at, name, minutes, is_default, active)
VALUES (uuidv7(), 0, now(), now(), 'Strassenverkehrsamt Winterthur-Wülflingen', 60, true, true);

-- The station of a task's MFK; the tasks with MFK so far went there
ALTER TABLE task
    ADD COLUMN mfk_station_id  uuid  REFERENCES inspection_station (id),
    ADD CONSTRAINT task_mfk_station_with_mfk CHECK (mfk OR mfk_station_id IS NULL);

UPDATE task SET mfk_station_id = (SELECT id FROM inspection_station WHERE is_default) WHERE mfk;

CREATE INDEX task_mfk_station ON task (mfk_station_id);
