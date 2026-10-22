-- The parts of a task are positions of the shopping list (FB-19): the text field "Material bestellen"
-- of the task goes. What was written there is taken over, nothing is lost: one position per task,
-- recorded by who accepted the task (older tasks: who created it), its state and day of order as
-- they were. The supplier was free text – one of the supplier list with that name is linked, any
-- other stays as a note of exactly the position moved here.

WITH moved AS (
    INSERT INTO shopping_item (id, version, created_at, updated_at, created_by, updated_by, description, quantity, status,
                               recorded_by_id, task_id, supplier_id, ordered_on, arrived_on)
    SELECT uuidv7(), 0, t.created_at, t.updated_at, t.created_by, t.updated_by, t.parts_description, 1, t.parts_status,
           COALESCE(t.accepted_by, t.created_by), t.id,
           (SELECT s.id FROM supplier s WHERE lower(trim(s.name)) = lower(trim(t.parts_supplier)) ORDER BY s.id LIMIT 1),
           CASE WHEN t.parts_status = 'TO_ORDER' THEN NULL ELSE t.parts_ordered_on END,
           CASE WHEN t.parts_status = 'ARRIVED' THEN (t.updated_at AT TIME ZONE 'Europe/Zurich')::date END
    FROM task t
    WHERE t.parts_description IS NOT NULL
    RETURNING id, task_id, supplier_id, created_at, created_by
)
INSERT INTO shopping_entry (id, version, created_at, updated_at, created_by, item_id, kind, text)
SELECT uuidv7(), 0, m.created_at, m.created_at, m.created_by, m.id, 'NOTE', left('Lieferant: ' || t.parts_supplier, 1000)
FROM moved m
JOIN task t ON t.id = m.task_id
WHERE t.parts_supplier IS NOT NULL AND m.supplier_id IS NULL;

-- the checks of V11 on these columns go with them
ALTER TABLE task
    DROP COLUMN parts_description,
    DROP COLUMN parts_status,
    DROP COLUMN parts_supplier,
    DROP COLUMN parts_ordered_on;
