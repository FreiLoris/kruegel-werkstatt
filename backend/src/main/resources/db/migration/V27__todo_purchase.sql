-- Shopping list ↔ stock list and suppliers (13g, FB-08/FB-09): an entry of the shopping list may
-- name the article in stock and the supplier to order from. Only on the shopping list. A deleted
-- article or supplier leaves the entry (it may still need buying), without the link.
ALTER TABLE todo
    ADD COLUMN stock_item_id uuid REFERENCES stock_item (id) ON DELETE SET NULL,
    ADD COLUMN supplier_id   uuid REFERENCES supplier (id) ON DELETE SET NULL,
    ADD CHECK (shopping OR (stock_item_id IS NULL AND supplier_id IS NULL));

CREATE INDEX todo_stock_item ON todo (stock_item_id);
CREATE INDEX todo_supplier ON todo (supplier_id);
