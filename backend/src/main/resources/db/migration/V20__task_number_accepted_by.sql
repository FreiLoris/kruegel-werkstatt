-- 12d: the app assigns the task number itself (the workshop works with the order sheets of this
-- app; SwissGarage only writes the invoice), and a task knows who accepted it ("Annehmer").

-- Who took the order from the customer. Chosen in the wizard – not "created by": everyone uses
-- every PC, so the person of the device is often someone else. Empty for tasks from before.
ALTER TABLE task ADD COLUMN accepted_by uuid REFERENCES employee (id);

-- The last running number per year: "26-0001", "26-0002", … Taken inside the transaction that
-- creates the task (row lock), so two devices never get the same number and a failed save leaves
-- no gap.
CREATE TABLE task_number_counter (
    year         smallint  PRIMARY KEY CHECK (year BETWEEN 2000 AND 2099),
    last_number  integer   NOT NULL CHECK (last_number >= 0)
);

-- Tasks entered so far without a number get one, in the order they were created. Numbers typed
-- by hand (SwissGarage) stay; a generated number that happens to exist already is skipped.
DO $$
DECLARE
    t       record;
    y       smallint;
    n       integer;
    number  text;
BEGIN
    FOR t IN SELECT id, created_at FROM task WHERE task_number IS NULL ORDER BY created_at, id LOOP
        y := extract(year FROM t.created_at AT TIME ZONE 'Europe/Zurich');
        LOOP
            INSERT INTO task_number_counter (year, last_number) VALUES (y, 1)
            ON CONFLICT (year) DO UPDATE SET last_number = task_number_counter.last_number + 1
            RETURNING last_number INTO n;
            number := lpad((y % 100)::text, 2, '0') || '-' || lpad(n::text, 4, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM task WHERE task_number = number);
        END LOOP;
        UPDATE task SET task_number = number WHERE id = t.id;
    END LOOP;
END $$;
