-- The trip to the inspection (FB-10): how long the car is away incl. the drive, and who drives it.
-- Only a hint in the calendar ("Ohne Lift") – it takes nobody's time in the planning.
ALTER TABLE task
    ADD COLUMN mfk_minutes    integer  CHECK (mfk_minutes BETWEEN 15 AND 480),
    ADD COLUMN mfk_driver_id  uuid     REFERENCES employee (id);

-- Tasks with MFK so far: one hour, like a new one
UPDATE task SET mfk_minutes = 60 WHERE mfk;

ALTER TABLE task
    ADD CONSTRAINT task_mfk_minutes_with_mfk CHECK (mfk = (mfk_minutes IS NOT NULL)),
    ADD CONSTRAINT task_mfk_driver_with_mfk CHECK (mfk OR mfk_driver_id IS NULL);

-- Day, week and dashboard: the MFK appointments of a period
CREATE INDEX task_mfk_appointment ON task (mfk_appointment) WHERE mfk_appointment IS NOT NULL;
