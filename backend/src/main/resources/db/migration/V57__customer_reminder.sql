-- 17a: the customer is reminded of the appointment the working day before – an SMS, else an e-mail.
-- Ticked on every task unless taken off; a customer may want none at all.
ALTER TABLE task ADD COLUMN remind_customer boolean NOT NULL DEFAULT true;
ALTER TABLE customer ADD COLUMN no_reminders boolean NOT NULL DEFAULT false;

-- Off until the workshop turns it on in the settings; then sent from send_time on.
CREATE TABLE reminder_settings (
    id          uuid        PRIMARY KEY,
    version     bigint      NOT NULL,
    created_at  timestamptz NOT NULL,
    updated_at  timestamptz NOT NULL,
    created_by  uuid        REFERENCES employee (id),
    updated_by  uuid        REFERENCES employee (id),

    enabled     boolean     NOT NULL,
    send_time   time        NOT NULL CHECK (send_time BETWEEN '08:00' AND '19:00')
);

INSERT INTO reminder_settings (id, version, created_at, updated_at, enabled, send_time)
VALUES (uuidv7(), 0, now(), now(), false, '16:00');

-- One reminder per task and day the car is to be brought – a task moved to another day is reminded
-- again. Also when nothing could be sent: then someone has to call.
CREATE TABLE task_reminder (
    id             uuid        PRIMARY KEY,
    version        bigint      NOT NULL,
    created_at     timestamptz NOT NULL,
    updated_at     timestamptz NOT NULL,
    created_by     uuid        REFERENCES employee (id),
    updated_by     uuid        REFERENCES employee (id),

    task_id        uuid        NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    drop_off_date  date        NOT NULL,
    channel        text        CHECK (channel IN ('SMS', 'EMAIL')),
    outcome        text        NOT NULL CHECK (outcome IN ('SENT', 'LOGGED', 'FAILED', 'NO_CONTACT')),
    error          text        CHECK (length(error) <= 500),
    UNIQUE (task_id, drop_off_date),
    CHECK ((outcome = 'NO_CONTACT') = (channel IS NULL))
);
