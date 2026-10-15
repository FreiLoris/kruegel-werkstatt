-- The tyre change of a task booked in the tyre hotel (FB-06/FB-07, 13q): the history says which
-- task retrieved a set and which one stored it. A deleted task leaves the history, without the link.
ALTER TABLE tire_set_event ADD COLUMN task_id uuid REFERENCES task (id) ON DELETE SET NULL;

-- A task mounts one set and stores one – two devices booking at once: the second is refused
CREATE UNIQUE INDEX tire_set_event_task_unique ON tire_set_event (task_id, kind)
    WHERE task_id IS NOT NULL AND kind IN ('STORED', 'RETRIEVED');
