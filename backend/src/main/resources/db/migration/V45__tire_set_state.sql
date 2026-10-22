-- Tyres also without the hotel (FB-12): a set belongs to its vehicle and is in one of three places –
-- in the hotel (with its place), on the car, or with the customer (taken home, brought next time).
-- Tyres the customer brings or takes home are kept too, with their tread depths, so the next call
-- shows whether they are still good. A set that never was in the hotel has no day it was stored.

ALTER TABLE tire_set ADD COLUMN state text CHECK (state IN ('IN_HOTEL', 'MOUNTED', 'WITH_CUSTOMER'));
-- until now a set out of the hotel went back on the car
UPDATE tire_set SET state = CASE WHEN retrieved_on IS NULL THEN 'IN_HOTEL' ELSE 'MOUNTED' END;
ALTER TABLE tire_set ALTER COLUMN state SET NOT NULL;

ALTER TABLE tire_set ALTER COLUMN stored_on DROP NOT NULL;
ALTER TABLE tire_set
    ADD CONSTRAINT tire_set_in_hotel_was_stored CHECK (state <> 'IN_HOTEL' OR (stored_on IS NOT NULL AND retrieved_on IS NULL));

-- a place only in the hotel
ALTER TABLE tire_set
    DROP CONSTRAINT tire_set_place_only_in_hotel,
    ADD CONSTRAINT tire_set_place_only_in_hotel CHECK (state = 'IN_HOTEL' OR place_id IS NULL);

DROP INDEX tire_set_in_hotel;
CREATE INDEX tire_set_in_hotel ON tire_set (stored_on) WHERE state = 'IN_HOTEL';

-- New steps of a set: recorded without the hotel, put on the car from the customer, taken home
ALTER TABLE tire_set_event
    DROP CONSTRAINT tire_set_event_kind_check,
    ADD CONSTRAINT tire_set_event_kind_check
        CHECK (kind IN ('STORED', 'MEASURED', 'MOVED', 'RETRIEVED', 'RECORDED', 'MOUNTED', 'TAKEN_HOME'));

-- a task puts one set on (retrieved or mounted) and takes one off (stored or taken home) – also when
-- two devices book at once: one per group, not only one per kind
DROP INDEX tire_set_event_task_unique;
CREATE UNIQUE INDEX tire_set_event_task_unique ON tire_set_event (task_id, (kind IN ('RETRIEVED', 'MOUNTED')))
    WHERE task_id IS NOT NULL AND kind IN ('STORED', 'RETRIEVED', 'MOUNTED', 'TAKEN_HOME');
