-- Stock list (FB-08): what the workshop has in stock and where it lies. Kept by hand – no stock
-- bookings, no minimum quantities (the workshop's wish). Separate from the tyre hotel (FB-07).

-- Where things lie (shelf, compartment, …) – named freely in the settings. Like service items:
-- one no longer used is deactivated, not deleted – articles may still refer to it.
CREATE TABLE storage_location (
    id          uuid         PRIMARY KEY,
    version     bigint       NOT NULL,
    created_at  timestamptz  NOT NULL,
    updated_at  timestamptz  NOT NULL,
    created_by  uuid         REFERENCES employee (id),
    updated_by  uuid         REFERENCES employee (id),

    name        text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
    active      boolean      NOT NULL,
    -- order in the filter and in the form (e.g. along the shelves)
    sort_order  integer      NOT NULL
);

CREATE UNIQUE INDEX storage_location_active_name_unique ON storage_location (lower(trim(name))) WHERE active;

CREATE TABLE stock_item (
    id                   uuid         PRIMARY KEY,
    version              bigint       NOT NULL,
    created_at           timestamptz  NOT NULL,
    updated_at           timestamptz  NOT NULL,
    created_by           uuid         REFERENCES employee (id),
    updated_by           uuid         REFERENCES employee (id),

    name                 text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    category             text         NOT NULL CHECK (category IN ('SPARE_PART', 'CONSUMABLE', 'TOOL')),
    article_number       text         CHECK (length(article_number) <= 60),
    manufacturer         text         CHECK (length(manufacturer) <= 60),
    -- a number (answer of the workshop 2026-10-14); empty = not counted
    quantity             integer      CHECK (quantity >= 0),
    storage_location_id  uuid         REFERENCES storage_location (id),
    remark               text         CHECK (length(remark) <= 1000)
);

CREATE INDEX stock_item_storage_location ON stock_item (storage_location_id);
