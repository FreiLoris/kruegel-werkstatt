-- FB-29: after some minutes without use a device asks again who is at it – every device but the
-- ones "only looking" (the workshop TV). The minutes are one setting for all, 5 by default.
CREATE TABLE screen_lock_settings (
    id            uuid          PRIMARY KEY,
    version       bigint        NOT NULL,
    created_at    timestamptz   NOT NULL,
    updated_at    timestamptz   NOT NULL,
    created_by    uuid          REFERENCES employee (id),
    updated_by    uuid          REFERENCES employee (id),

    -- 0 = never
    lock_minutes  integer       NOT NULL CHECK (lock_minutes BETWEEN 0 AND 120)
);

INSERT INTO screen_lock_settings (id, version, created_at, updated_at, lock_minutes)
VALUES (uuidv7(), 0, now(), now(), 5);
