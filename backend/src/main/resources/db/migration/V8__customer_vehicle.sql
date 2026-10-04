-- Customers and their vehicles – hybrid model from ADR 0003:
--   source SWISSGARAGE: created and updated only by the import, key = SwissGarage number, read-only in the app
--   source LOCAL:       walk-ins created in the app, editable
-- Records are deactivated, never deleted: tasks refer to them.

CREATE TABLE customer (
    id                  uuid         PRIMARY KEY,
    version             bigint       NOT NULL,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    created_by          uuid         REFERENCES employee (id),
    updated_by          uuid         REFERENCES employee (id),

    source              text         NOT NULL CHECK (source IN ('SWISSGARAGE', 'LOCAL')),
    -- SwissGarage "Adressnummer"; only for source SWISSGARAGE
    swissgarage_number  text,

    salutation          text,
    first_name          text,
    last_name           text,
    -- Company customers: company name instead of (or in addition to) a person
    company             text,
    -- SwissGarage "Zusatz", e.g. contact person or c/o
    addition            text,
    street              text,
    postal_code         text,
    city                text,
    phone               text,
    mobile              text,
    email               text,

    active              boolean      NOT NULL,

    -- A customer needs a name: a person or a company
    CHECK (last_name IS NOT NULL OR company IS NOT NULL),
    CHECK ((source = 'SWISSGARAGE') = (swissgarage_number IS NOT NULL))
);

CREATE UNIQUE INDEX customer_swissgarage_number_unique ON customer (swissgarage_number) WHERE swissgarage_number IS NOT NULL;


CREATE TABLE vehicle (
    id                  uuid         PRIMARY KEY,
    version             bigint       NOT NULL,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    created_by          uuid         REFERENCES employee (id),
    updated_by          uuid         REFERENCES employee (id),

    source              text         NOT NULL CHECK (source IN ('SWISSGARAGE', 'LOCAL')),
    -- SwissGarage "Int.Nr."; only for source SWISSGARAGE
    swissgarage_number  text,
    -- Holder; may be empty (e.g. holder unknown or no longer active)
    customer_id         uuid         REFERENCES customer (id),

    -- NOT unique: in Switzerland the plate belongs to the holder and moves to the next car
    license_plate       text         CHECK (license_plate = upper(license_plate)),
    make                text,
    model               text,
    -- VIN / SwissGarage "Chassis-Nr."
    vin                 text,
    first_registration  date,
    model_year          integer      CHECK (model_year BETWEEN 1900 AND 2100),
    mileage_km          integer      CHECK (mileage_km >= 0),
    -- Date of the LAST official inspection (MFK) – the export only contains past dates
    last_mfk            date,
    color               text,
    fuel                text,

    active              boolean      NOT NULL,

    CHECK (make IS NOT NULL OR model IS NOT NULL),
    CHECK ((source = 'SWISSGARAGE') = (swissgarage_number IS NOT NULL))
);

CREATE UNIQUE INDEX vehicle_swissgarage_number_unique ON vehicle (swissgarage_number) WHERE swissgarage_number IS NOT NULL;
CREATE INDEX vehicle_customer_id ON vehicle (customer_id);
CREATE INDEX vehicle_license_plate ON vehicle (license_plate);
