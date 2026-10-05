-- To-dos (8a). The old app kept the person as a name and the task as a copy of its number text –
-- a renamed person or a changed task number broke the link (bugs #3, #14). Here both are references.
-- A shopping list is not its own module: a to-do with the flag "shopping".

CREATE TABLE todo (
    id           uuid         PRIMARY KEY,
    version      bigint       NOT NULL,
    created_at   timestamptz  NOT NULL,
    updated_at   timestamptz  NOT NULL,
    created_by   uuid         REFERENCES employee (id),
    updated_by   uuid         REFERENCES employee (id),

    text         text         NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 500),
    -- who takes care of it; empty = not assigned yet
    assignee_id  uuid         REFERENCES employee (id),
    due_date     date,
    shopping     boolean      NOT NULL,
    -- the task it is about; a deleted task leaves the to-do (it may still need doing), without link
    task_id      uuid         REFERENCES task (id) ON DELETE SET NULL,
    -- done = when and by whom (instead of a bare yes/no – "who ticked that off?")
    done_at      timestamptz,
    done_by      uuid         REFERENCES employee (id),

    CHECK (done_by IS NULL OR done_at IS NOT NULL)
);

-- the open list is sorted by deadline
CREATE INDEX todo_open ON todo (due_date) WHERE done_at IS NULL;
CREATE INDEX todo_task ON todo (task_id);
CREATE INDEX todo_assignee ON todo (assignee_id);
