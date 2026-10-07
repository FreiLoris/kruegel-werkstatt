-- Pinboard notes (8c): internal messages ("Post-it"), assigned to one or more people, optionally about
-- a task, archived instead of deleted. Sub-tasks are ordinary to-dos with a link to their note – the
-- old app kept a second, never updated list inside the note (bug #10). The task by ID (F8, bug #14).
-- The author is created_by (the person using the device).

CREATE TABLE note (
    id           uuid         PRIMARY KEY,
    version      bigint       NOT NULL,
    created_at   timestamptz  NOT NULL,
    updated_at   timestamptz  NOT NULL,
    created_by   uuid         REFERENCES employee (id),
    updated_by   uuid         REFERENCES employee (id),

    text         text         NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 2000),
    -- longer background ("Infos")
    info         text         CHECK (length(info) <= 4000),
    -- a deleted task leaves the note, without link
    task_id      uuid         REFERENCES task (id) ON DELETE SET NULL,
    -- archived = put away; its open sub-tasks were ticked off at exactly this moment
    archived_at  timestamptz
);

CREATE INDEX note_open ON note (created_at) WHERE archived_at IS NULL;
CREATE INDEX note_task ON note (task_id);

-- who takes care of it – several people possible ("Reto und Erich")
CREATE TABLE note_assignee (
    note_id      uuid  NOT NULL REFERENCES note (id) ON DELETE CASCADE,
    employee_id  uuid  NOT NULL REFERENCES employee (id),
    PRIMARY KEY (note_id, employee_id)
);

CREATE INDEX note_assignee_employee ON note_assignee (employee_id);

-- sub-tasks of a note are to-dos; deleting the note deletes them with it
ALTER TABLE todo ADD COLUMN note_id uuid REFERENCES note (id) ON DELETE CASCADE;
CREATE INDEX todo_note ON todo (note_id);
