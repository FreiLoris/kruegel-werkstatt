-- 6k: the day view is a time grid per lift – the time decides the order, the manual order of 6f
-- (position within a lift column) is gone.

ALTER TABLE task DROP COLUMN sort_order;  -- also drops the index task_appointment that contained it

CREATE INDEX task_appointment ON task (appointment_date, lift_id);
-- the day view also needs tasks of earlier days that still take a lift (waiting for parts)
CREATE INDEX task_appointment_end ON task (appointment_end);
