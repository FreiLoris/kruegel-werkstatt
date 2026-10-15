-- Storage places of the tyre hotel (FB-07): a location is a floor grid (columns × rows, a few sets
-- per field – the tyre trolleys of the workshop's upper floor) or shelves (shelves × levels ×
-- compartments – the container). Its places are generated from these sizes, nobody enters them one
-- by one. The names are not fixed in the code: the workshop sets them up in the settings.

CREATE TABLE tire_location (
    id          uuid         PRIMARY KEY,
    version     bigint       NOT NULL,
    created_at  timestamptz  NOT NULL,
    updated_at  timestamptz  NOT NULL,
    created_by  uuid         REFERENCES employee (id),
    updated_by  uuid         REFERENCES employee (id),

    -- the start of every address, e.g. "OG" → "OG-B3-1"
    code        text         NOT NULL CHECK (code ~ '^[A-Z0-9]{1,6}$'),
    name        text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
    kind        text         NOT NULL CHECK (kind IN ('FLOOR', 'SHELVES')),
    -- FLOOR: columns (A, B, …), rows (1, 2, …), sets per field
    -- SHELVES: shelves, levels, compartments
    size_a      integer      NOT NULL CHECK (size_a BETWEEN 1 AND 26),
    size_b      integer      NOT NULL CHECK (size_b BETWEEN 1 AND 30),
    size_c      integer      NOT NULL CHECK (size_c BETWEEN 1 AND 30),
    sort_order  integer      NOT NULL
);

CREATE UNIQUE INDEX tire_location_code_unique ON tire_location (code);

-- One place takes one set. A place beyond the sizes of its location (made smaller) is no longer
-- used – it is kept while the history names it.
CREATE TABLE tire_place (
    id           uuid         PRIMARY KEY,
    version      bigint       NOT NULL,
    created_at   timestamptz  NOT NULL,
    updated_at   timestamptz  NOT NULL,
    created_by   uuid         REFERENCES employee (id),
    updated_by   uuid         REFERENCES employee (id),

    location_id  uuid         NOT NULL REFERENCES tire_location (id) ON DELETE CASCADE,
    -- column/shelf, row/level, set/compartment – from 1
    a            integer      NOT NULL CHECK (a >= 1),
    b            integer      NOT NULL CHECK (b >= 1),
    c            integer      NOT NULL CHECK (c >= 1),
    address      text         NOT NULL,
    active       boolean      NOT NULL,
    UNIQUE (location_id, a, b, c)
);

CREATE UNIQUE INDEX tire_place_address_unique ON tire_place (address);

-- The place of a set in the hotel; a retrieved set has none any more
ALTER TABLE tire_set
    ADD COLUMN place_id  uuid  REFERENCES tire_place (id),
    ADD CONSTRAINT tire_set_place_only_in_hotel CHECK (retrieved_on IS NULL OR place_id IS NULL);

-- one set per place
CREATE UNIQUE INDEX tire_set_one_per_place ON tire_set (place_id) WHERE place_id IS NOT NULL;

-- Moving goes into the history; every step names the place of that moment (as text: a place may be
-- renamed with its location's code later, the history stays as it was)
ALTER TABLE tire_set_event
    DROP CONSTRAINT tire_set_event_kind_check,
    ADD CONSTRAINT tire_set_event_kind_check CHECK (kind IN ('STORED', 'MEASURED', 'MOVED', 'RETRIEVED')),
    ADD COLUMN place  text  CHECK (length(place) <= 30);
