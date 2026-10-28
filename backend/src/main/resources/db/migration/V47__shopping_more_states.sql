-- FB-28: more states of an order – who is up: us or the supplier.
-- Existing positions keep their state (TO_ORDER, ORDERED, ARRIVED stay as they are).

ALTER TABLE shopping_item DROP CONSTRAINT shopping_item_status_check;
ALTER TABLE shopping_item ADD CONSTRAINT shopping_item_status_check CHECK (status IN (
    'TO_ORDER', 'QUOTE_REQUESTED', 'INFO_NEEDED', 'QUOTE_RECEIVED', 'ORDERED', 'ARRIVED', 'CANCELLED'));

ALTER TABLE shopping_entry DROP CONSTRAINT shopping_entry_status_check;
ALTER TABLE shopping_entry ADD CONSTRAINT shopping_entry_status_check CHECK (status IN (
    'TO_ORDER', 'QUOTE_REQUESTED', 'INFO_NEEDED', 'QUOTE_RECEIVED', 'ORDERED', 'ARRIVED', 'CANCELLED'));

-- the open list: neither arrived nor cancelled
DROP INDEX shopping_item_open;
CREATE INDEX shopping_item_open ON shopping_item (created_at) WHERE status NOT IN ('ARRIVED', 'CANCELLED');
