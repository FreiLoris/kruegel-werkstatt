-- Duration of a task: until when it occupies its lift (smoke test wish – see how long a lift is taken
-- and how many cars fit in a day). Date AND time: a car waiting for parts can stay several days.

ALTER TABLE task ADD COLUMN appointment_end timestamp;

-- Existing tasks: 1 hour – but never into the next task on the same lift, the constraint below
-- would refuse it.
WITH ordered AS (
    SELECT id,
           appointment_date + appointment_time AS start_at,
           LEAD(appointment_date + appointment_time)
               OVER (PARTITION BY lift_id ORDER BY appointment_date, appointment_time, id) AS next_start
    FROM task
)
UPDATE task t
SET appointment_end = CASE
        WHEN t.lift_id IS NOT NULL AND o.next_start < o.start_at + interval '1 hour' THEN o.next_start
        ELSE o.start_at + interval '1 hour'
    END
FROM ordered o
WHERE o.id = t.id;

-- Two tasks with exactly the same start on the same lift cannot both stay there: the first one
-- (it got no time at all above) goes to "Ohne Lift" with its hour – nothing is lost, it is visible.
UPDATE task
SET lift_id = NULL,
    appointment_end = appointment_date + appointment_time + interval '1 hour'
WHERE appointment_end <= appointment_date + appointment_time;

ALTER TABLE task ALTER COLUMN appointment_end SET NOT NULL;
ALTER TABLE task ADD CONSTRAINT task_end_after_start CHECK (appointment_end > appointment_date + appointment_time);

-- THE rule: one lift, no two tasks at the same time – like the courtesy cars, checked by the database.
-- '[)': one task until 10:00 and the next from 10:00 are fine. Tasks without lift are free.
ALTER TABLE task ADD CONSTRAINT task_no_lift_overlap EXCLUDE USING gist (
    lift_id WITH =,
    tsrange(appointment_date + appointment_time, appointment_end, '[)') WITH &&
) WHERE (lift_id IS NOT NULL);
