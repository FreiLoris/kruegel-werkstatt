-- Orders without appointment (12d-3): the order is taken, when the car comes is not known yet –
-- or a planned order is taken out of the plan again (e.g. waiting for parts) and must not be
-- forgotten. Such a task has no day, no time and no end.
ALTER TABLE task ALTER COLUMN appointment_date DROP NOT NULL;
ALTER TABLE task ALTER COLUMN appointment_time DROP NOT NULL;
ALTER TABLE task ALTER COLUMN appointment_end DROP NOT NULL;

-- all three or none
ALTER TABLE task ADD CONSTRAINT task_appointment_complete CHECK (
    (appointment_date IS NULL) = (appointment_time IS NULL)
    AND (appointment_date IS NULL) = (appointment_end IS NULL));

-- without a day there is nothing that hangs on it: no lift (so the rule "one lift, one car at a
-- time" never sees such a task), no "kommt früher"/"fertig bis", no waiting customer, no open time
ALTER TABLE task ADD CONSTRAINT task_without_appointment_has_no_place CHECK (
    appointment_date IS NOT NULL
    OR (lift_id IS NULL AND arrives_earlier IS NULL AND ready_by IS NULL AND NOT waiting_customer AND NOT time_open));

-- the list "Ohne Termin": the oldest first
CREATE INDEX task_without_appointment ON task (created_at) WHERE appointment_date IS NULL;
