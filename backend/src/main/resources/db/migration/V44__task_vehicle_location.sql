-- Where the vehicle is (FB-16): in our workshop, or still with the customer – then the customer must
-- be called in once the task can be planned ("aufbieten"). Tasks already being worked on are here –
-- from now on setting "In Arbeit" moves the car here too (Task.changeStatus).
ALTER TABLE task ADD COLUMN vehicle_location text NOT NULL DEFAULT 'AT_CUSTOMER'
    CHECK (vehicle_location IN ('AT_WORKSHOP', 'AT_CUSTOMER'));

UPDATE task SET vehicle_location = 'AT_WORKSHOP' WHERE status IN ('IN_PROGRESS', 'WAITING_FOR_PARTS');

ALTER TABLE task ALTER COLUMN vehicle_location DROP DEFAULT;
