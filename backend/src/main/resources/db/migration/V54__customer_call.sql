-- Who called the customer and with what result (FB-16, FB-21): "angerufen am … – nicht erreicht" next
-- to the phone number, so two people do not call the same customer twice. Per customer: the reason
-- (collect the car, the season change) does not matter – a call is a call.
CREATE TABLE customer_call (
    id           uuid        PRIMARY KEY,
    version      bigint      NOT NULL,
    created_at   timestamptz NOT NULL,
    updated_at   timestamptz NOT NULL,
    created_by   uuid        REFERENCES employee (id),
    updated_by   uuid        REFERENCES employee (id),

    customer_id  uuid        NOT NULL REFERENCES customer (id),
    outcome      text        NOT NULL CHECK (outcome IN ('REACHED', 'NOT_REACHED', 'CALLBACK')),
    note         text        CHECK (length(note) <= 200)
);

-- the latest call of each customer of a list
CREATE INDEX customer_call_latest ON customer_call (customer_id, created_at DESC);
