-- Absences of employees (9a): vacation, sick, external work (at a company), training. The category is
-- a fixed value – the old app stored "Ferien" but counted 'ferien', so the statistics were always 0
-- (bug #1). Half days: the first day may start at noon, the last day may end at noon.

CREATE TABLE absence (
    id                uuid         PRIMARY KEY,
    version           bigint       NOT NULL,
    created_at        timestamptz  NOT NULL,
    updated_at        timestamptz  NOT NULL,
    created_by        uuid         REFERENCES employee (id),
    updated_by        uuid         REFERENCES employee (id),

    employee_id       uuid         NOT NULL REFERENCES employee (id),
    category          text         NOT NULL CHECK (category IN ('VACATION', 'SICK', 'EXTERNAL_WORK', 'TRAINING')),
    -- where (external work only, required there)
    company           text         CHECK (length(trim(company)) BETWEEN 1 AND 100),
    note              text         CHECK (length(note) <= 500),
    start_date        date         NOT NULL,
    -- true = only the afternoon of the first day
    starts_afternoon  boolean      NOT NULL,
    end_date          date         NOT NULL,
    -- true = only the morning of the last day
    ends_noon         boolean      NOT NULL,

    CHECK (end_date >= start_date),
    -- one day "only afternoon" AND "only morning" would be nothing
    CHECK (NOT (start_date = end_date AND starts_afternoon AND ends_noon)),
    CHECK ((category = 'EXTERNAL_WORK') = (company IS NOT NULL)),

    -- one person, nothing twice at the same time – to the half day ('[)': morning sick, afternoon
    -- training is fine)
    CONSTRAINT absence_no_overlap EXCLUDE USING gist (
        employee_id WITH =,
        tsrange(start_date + CASE WHEN starts_afternoon THEN time '12:00' ELSE time '00:00' END,
                CASE WHEN ends_noon THEN end_date + time '12:00' ELSE end_date + 1 END, '[)') WITH &&
    )
);

CREATE INDEX absence_period ON absence (start_date, end_date);
