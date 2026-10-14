-- Insurances (FB-06): for an insurance case the task sheet prints the insurance and its phone.
-- No longer used ones are deactivated, not deleted – old tasks still name them.
CREATE TABLE insurance (
    id          uuid         PRIMARY KEY,
    version     bigint       NOT NULL,
    created_at  timestamptz  NOT NULL,
    updated_at  timestamptz  NOT NULL,
    created_by  uuid         REFERENCES employee (id),
    updated_by  uuid         REFERENCES employee (id),

    name        text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    phone       text         CHECK (length(phone) <= 40),
    email       text         CHECK (length(email) <= 100),
    active      boolean      NOT NULL
);

CREATE UNIQUE INDEX insurance_name_unique ON insurance (lower(trim(name)));

-- The insurance case of a task: the insurance, and the claim number once it is known.
ALTER TABLE task
    ADD COLUMN insurance_id  uuid  REFERENCES insurance (id),
    ADD COLUMN claim_number  text  CHECK (length(claim_number) <= 60),
    ADD CONSTRAINT task_claim_number_needs_insurance CHECK (claim_number IS NULL OR insurance_id IS NOT NULL);

CREATE INDEX task_insurance ON task (insurance_id);
