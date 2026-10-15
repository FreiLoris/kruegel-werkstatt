-- Tyre hotel (FB-07): the customers' tyres or wheels stored by the workshop – replaces the tyre
-- hotel of SwissGarage. A set is stored, measured again, and retrieved; every step is kept in its
-- history with the tread depths, so the wear over the years can be seen.
-- The storage places follow with 13n: until then a set has none ("noch nicht zugewiesen").

CREATE TABLE tire_set (
    id              uuid          PRIMARY KEY,
    version         bigint        NOT NULL,
    created_at      timestamptz   NOT NULL,
    updated_at      timestamptz   NOT NULL,
    created_by      uuid          REFERENCES employee (id),
    updated_by      uuid          REFERENCES employee (id),

    customer_id     uuid          NOT NULL REFERENCES customer (id),
    -- may be open, like on a task (e.g. a car not in SwissGarage yet)
    vehicle_id      uuid          REFERENCES vehicle (id),

    season          text          NOT NULL CHECK (season IN ('SUMMER', 'WINTER', 'ALL_SEASON')),
    -- complete wheels or only the tyres; rims only with wheels
    kind            text          NOT NULL CHECK (kind IN ('WHEELS', 'TIRES')),
    rims            text          CHECK (rims IN ('ALU', 'STEEL')),
    hub_caps        boolean       NOT NULL,
    wheel_bolts     boolean       NOT NULL,

    brand           text          CHECK (length(brand) <= 60),
    model           text          CHECK (length(model) <= 60),
    dimension       text          CHECK (length(dimension) <= 40),
    -- the tyres' year of manufacture (from the DOT code) – one for the set
    year            integer       CHECK (year BETWEEN 1990 AND 2100),
    remark          text          CHECK (length(remark) <= 500),

    -- tread depths in mm as last measured; empty = not measured
    depth_fl        numeric(3, 1) CHECK (depth_fl BETWEEN 0 AND 20),
    depth_fr        numeric(3, 1) CHECK (depth_fr BETWEEN 0 AND 20),
    depth_rl        numeric(3, 1) CHECK (depth_rl BETWEEN 0 AND 20),
    depth_rr        numeric(3, 1) CHECK (depth_rr BETWEEN 0 AND 20),

    stored_on       date          NOT NULL,
    -- empty = in the hotel
    retrieved_on    date,

    CHECK (kind = 'WHEELS' OR rims IS NULL),
    CHECK (retrieved_on IS NULL OR retrieved_on >= stored_on)
);

CREATE INDEX tire_set_customer ON tire_set (customer_id);
CREATE INDEX tire_set_vehicle ON tire_set (vehicle_id);
CREATE INDEX tire_set_in_hotel ON tire_set (stored_on) WHERE retrieved_on IS NULL;

-- What happened to a set: stored, measured again, retrieved – with the depths of that moment
CREATE TABLE tire_set_event (
    id              uuid          PRIMARY KEY,
    version         bigint        NOT NULL,
    created_at      timestamptz   NOT NULL,
    updated_at      timestamptz   NOT NULL,
    created_by      uuid          REFERENCES employee (id),
    updated_by      uuid          REFERENCES employee (id),

    tire_set_id     uuid          NOT NULL REFERENCES tire_set (id) ON DELETE CASCADE,
    kind            text          NOT NULL CHECK (kind IN ('STORED', 'MEASURED', 'RETRIEVED')),
    happened_on     date          NOT NULL,
    depth_fl        numeric(3, 1),
    depth_fr        numeric(3, 1),
    depth_rl        numeric(3, 1),
    depth_rr        numeric(3, 1),
    note            text          CHECK (length(note) <= 500)
);

CREATE INDEX tire_set_event_set ON tire_set_event (tire_set_id, happened_on);

-- When a tread depth is worth a word with the customer – one row, edited in the settings.
-- All-season tyres count like winter tyres (they are driven in winter).
CREATE TABLE tire_hotel_settings (
    id              uuid          PRIMARY KEY,
    version         bigint        NOT NULL,
    created_at      timestamptz   NOT NULL,
    updated_at      timestamptz   NOT NULL,
    created_by      uuid          REFERENCES employee (id),
    updated_by      uuid          REFERENCES employee (id),

    singleton       boolean       NOT NULL DEFAULT true UNIQUE CHECK (singleton),
    summer_mm       numeric(3, 1) NOT NULL,
    winter_mm       numeric(3, 1) NOT NULL,
    -- the legal minimum in Switzerland
    minimum_mm      numeric(3, 1) NOT NULL,
    CHECK (minimum_mm > 0 AND minimum_mm <= summer_mm AND minimum_mm <= winter_mm AND summer_mm <= 20 AND winter_mm <= 20)
);

INSERT INTO tire_hotel_settings (id, version, created_at, updated_at, summer_mm, winter_mm, minimum_mm)
VALUES (uuidv7(), 0, now(), now(), 3.0, 4.0, 1.6);
