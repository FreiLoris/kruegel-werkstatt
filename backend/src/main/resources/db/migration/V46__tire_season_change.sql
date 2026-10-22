-- Season change overview (FB-21): which customers changed their tyres this season and which still
-- have to be called. By the deadline the change should be done – 1 June for summer, 1 December for
-- winter tyres (decided by the workshop, changeable in the settings). Stored as 'MM-DD'.

CREATE TABLE tire_season_settings (
    id              uuid          PRIMARY KEY,
    version         bigint        NOT NULL,
    created_at      timestamptz   NOT NULL,
    updated_at      timestamptz   NOT NULL,
    created_by      uuid          REFERENCES employee (id),
    updated_by      uuid          REFERENCES employee (id),

    summer_deadline text          NOT NULL CHECK (summer_deadline ~ '^[01][0-9]-[0-3][0-9]$'),
    winter_deadline text          NOT NULL CHECK (winter_deadline ~ '^[01][0-9]-[0-3][0-9]$')
);

INSERT INTO tire_season_settings (id, version, created_at, updated_at, summer_deadline, winter_deadline)
VALUES (uuidv7(), 0, now(), now(), '06-01', '12-01');

-- "Quittiert": the set is not changed this season on purpose (e.g. the winter tyres are driven
-- down in summer). Only for the season of that deadline – the next season shows the set again.
-- Who and when: created_by / created_at. Undone = deleted.
CREATE TABLE tire_season_ack (
    id              uuid          PRIMARY KEY,
    version         bigint        NOT NULL,
    created_at      timestamptz   NOT NULL,
    updated_at      timestamptz   NOT NULL,
    created_by      uuid          REFERENCES employee (id),
    updated_by      uuid          REFERENCES employee (id),

    tire_set_id     uuid          NOT NULL REFERENCES tire_set (id) ON DELETE CASCADE,
    deadline        date          NOT NULL,
    reason          text          CHECK (length(reason) <= 200),

    CONSTRAINT tire_season_ack_once UNIQUE (tire_set_id, deadline)
);
