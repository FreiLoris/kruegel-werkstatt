-- Vacation entitlement per year (decision of the workshop): when a person's entitlement changes
-- (e.g. from 20 to 25 days at 50), the past years keep the value they had – "Übrig" of an earlier
-- year must not change afterwards. A year without an entry uses the person's current entitlement.
CREATE TABLE vacation_entitlement (
    id           uuid         PRIMARY KEY,
    version      bigint       NOT NULL,
    created_at   timestamptz  NOT NULL,
    updated_at   timestamptz  NOT NULL,
    created_by   uuid         REFERENCES employee (id),
    updated_by   uuid         REFERENCES employee (id),

    employee_id  uuid         NOT NULL REFERENCES employee (id),
    year         integer      NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    days         integer      NOT NULL CHECK (days BETWEEN 0 AND 60),

    UNIQUE (employee_id, year)
);
