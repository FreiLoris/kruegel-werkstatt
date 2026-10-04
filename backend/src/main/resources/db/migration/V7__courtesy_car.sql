-- Courtesy cars (Ersatzwagen): pool cars customers get while their car is in the workshop.
-- Only the cars themselves here; bookings follow in phase 7.

CREATE TABLE courtesy_car (
    id               uuid         PRIMARY KEY,
    version          bigint       NOT NULL,
    created_at       timestamptz  NOT NULL,
    updated_at       timestamptz  NOT NULL,
    created_by       uuid         REFERENCES employee (id),
    updated_by       uuid         REFERENCES employee (id),

    -- How the workshop calls the car, e.g. "Ersatzwagen 1" or "Polo blau"
    name             text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
    -- e.g. "VW Polo"
    model            text         CHECK (length(model) <= 40),
    -- Normalised by the application: upper case, single spaces, e.g. "ZH 123456"
    license_plate    text         CHECK (license_plate = upper(license_plate) AND length(license_plate) BETWEEN 1 AND 15),
    service_due      date,
    insurance_until  date,

    -- Cars that are sold or returned are deactivated: old bookings keep their reference
    active           boolean      NOT NULL,
    sort_order       integer      NOT NULL
);

CREATE UNIQUE INDEX courtesy_car_name_active_unique ON courtesy_car (lower(trim(name))) WHERE active;
CREATE UNIQUE INDEX courtesy_car_license_plate_active_unique ON courtesy_car (license_plate) WHERE active AND license_plate IS NOT NULL;
