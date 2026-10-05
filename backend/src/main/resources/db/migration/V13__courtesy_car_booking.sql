-- Courtesy car bookings: ONE table for every booking – from a task or on its own (e.g. a customer
-- without workshop task, internal use). The old app had two sources that did not know each other,
-- so a car could be given to two customers at the same time (bug #2, F2).

-- Needed for the exclusion constraint below: "same car" (uuid, =) together with "overlapping time" (gist)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE courtesy_car_booking (
    id                  uuid         PRIMARY KEY,
    version             bigint       NOT NULL,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    created_by          uuid         REFERENCES employee (id),
    updated_by          uuid         REFERENCES employee (id),

    courtesy_car_id     uuid         NOT NULL REFERENCES courtesy_car (id),
    -- The task the car belongs to; a deleted task takes its booking with it
    task_id             uuid         REFERENCES task (id) ON DELETE CASCADE,
    -- Who has the car when there is no task (otherwise the task's customer)
    holder              text         CHECK (length(trim(holder)) BETWEEN 1 AND 100),

    -- Swiss local time, like appointments
    pickup_at           timestamp    NOT NULL,
    return_at           timestamp    NOT NULL,
    -- When the car actually came back (recorded at the return)
    returned_at         timestamp,
    notes               text         CHECK (length(notes) <= 500),

    CHECK (return_at > pickup_at),
    CHECK (returned_at >= pickup_at),
    CHECK (task_id IS NOT NULL OR holder IS NOT NULL),

    -- THE rule: one car, no two bookings at the same time – checked by the database, so two devices
    -- booking in the same second cannot both win.
    -- '[)': return at 12:00 and the next pickup at 12:00 do not collide.
    -- Returned early → free from the actual return on (LEAST ignores an empty returned_at);
    -- returned late → recorded, but it does not block the next booking afterwards.
    CONSTRAINT courtesy_car_booking_no_overlap EXCLUDE USING gist (
        courtesy_car_id WITH =,
        tsrange(pickup_at, LEAST(returned_at, return_at), '[)') WITH &&
    )
);

CREATE INDEX courtesy_car_booking_task ON courtesy_car_booking (task_id);
CREATE INDEX courtesy_car_booking_period ON courtesy_car_booking (pickup_at, return_at);
