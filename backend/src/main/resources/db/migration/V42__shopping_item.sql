-- The shopping list rebuilt (FB-20, FB-19): positions of their own instead of to-dos with a flag.
-- A position knows what (description, number, quantity), its state, who put it on the list and who
-- orders it – that person gets a to-do of their own, linked to the position. Everything found out
-- about a part (supplier called, delivery date) goes into its entries, so do its state changes.

CREATE TABLE shopping_item (
    id             uuid         PRIMARY KEY,
    version        bigint       NOT NULL,
    created_at     timestamptz  NOT NULL,
    updated_at     timestamptz  NOT NULL,
    created_by     uuid         REFERENCES employee (id),
    updated_by     uuid         REFERENCES employee (id),

    description    text         NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 500),
    part_number    text         CHECK (length(part_number) <= 60),
    quantity       integer      NOT NULL CHECK (quantity BETWEEN 1 AND 9999),
    status         text         NOT NULL CHECK (status IN ('TO_ORDER', 'ORDERED', 'ARRIVED')),
    -- "Erfasst von": whom to ask; empty only for positions taken over from the old list
    recorded_by_id uuid         REFERENCES employee (id),
    -- "Bestellen durch": empty = not assigned (no to-do)
    order_by_id    uuid         REFERENCES employee (id),
    -- the task it is for; empty = for the workshop (coffee, material). A deleted task leaves it.
    task_id        uuid         REFERENCES task (id) ON DELETE SET NULL,
    stock_item_id  uuid         REFERENCES stock_item (id) ON DELETE SET NULL,
    supplier_id    uuid         REFERENCES supplier (id) ON DELETE SET NULL,
    ordered_on     date,
    expected_on    date,
    arrived_on     date,

    CHECK (status = 'ARRIVED' OR arrived_on IS NULL)
);

CREATE INDEX shopping_item_open ON shopping_item (created_at) WHERE status <> 'ARRIVED';
CREATE INDEX shopping_item_task ON shopping_item (task_id);
CREATE INDEX shopping_item_stock_item ON shopping_item (stock_item_id);
CREATE INDEX shopping_item_supplier ON shopping_item (supplier_id);

-- Notes ("Lieferant angerufen, ab Mi lieferbar") and state changes of a position. Who and when:
-- created_by and created_at.
CREATE TABLE shopping_entry (
    id         uuid         PRIMARY KEY,
    version    bigint       NOT NULL,
    created_at timestamptz  NOT NULL,
    updated_at timestamptz  NOT NULL,
    created_by uuid         REFERENCES employee (id),
    updated_by uuid         REFERENCES employee (id),

    item_id    uuid         NOT NULL REFERENCES shopping_item (id) ON DELETE CASCADE,
    kind       text         NOT NULL CHECK (kind IN ('NOTE', 'STATUS')),
    text       text         CHECK (length(trim(text)) BETWEEN 1 AND 1000),
    status     text         CHECK (status IN ('TO_ORDER', 'ORDERED', 'ARRIVED')),

    CHECK ((kind = 'NOTE' AND text IS NOT NULL AND status IS NULL) OR (kind = 'STATUS' AND status IS NOT NULL AND text IS NULL))
);

CREATE INDEX shopping_entry_item ON shopping_entry (item_id, created_at);

-- The to-do of "Bestellen durch" knows its position (only the ID, like the note of a sub-task).
-- Deleting the position deletes its to-do.
ALTER TABLE todo ADD COLUMN shopping_item_id uuid REFERENCES shopping_item (id) ON DELETE CASCADE;
CREATE UNIQUE INDEX todo_shopping_item ON todo (shopping_item_id) WHERE shopping_item_id IS NOT NULL;

-- The old shopping list: each entry becomes a position (same ID). Ticked off = arrived. Who wrote
-- it is who created it; who had it is who orders it.
INSERT INTO shopping_item (id, version, created_at, updated_at, created_by, updated_by, description, quantity, status,
                           recorded_by_id, order_by_id, task_id, stock_item_id, supplier_id, arrived_on)
SELECT id, 0, created_at, updated_at, created_by, updated_by, text, 1,
       CASE WHEN done_at IS NULL THEN 'TO_ORDER' ELSE 'ARRIVED' END,
       created_by, assignee_id, task_id, stock_item_id, supplier_id,
       CASE WHEN done_at IS NULL THEN NULL ELSE (done_at AT TIME ZONE 'Europe/Zurich')::date END
FROM todo
WHERE shopping;

-- An open entry with a person stays that person's to-do – now the to-do of its position
UPDATE todo
SET shopping_item_id = id,
    text             = left('Bestellen: ' || text, 500)
WHERE shopping AND done_at IS NULL AND assignee_id IS NOT NULL;

-- The others were only the list itself – the position keeps them. A sub-task of a pinboard note
-- that was on the shopping list leaves its note (go-live starts with a fresh database anyway).
DELETE FROM todo WHERE shopping AND shopping_item_id IS NULL;

-- To-dos are to-dos again (the check of 13g and its indexes go with the columns)
ALTER TABLE todo
    DROP COLUMN shopping,
    DROP COLUMN stock_item_id,
    DROP COLUMN supplier_id;
