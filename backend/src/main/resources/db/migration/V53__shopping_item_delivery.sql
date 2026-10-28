-- How a position is ordered (FB-30): one of the supplier's ways of delivery – "Tagesexpress",
-- "Nachtexpress" … – kept as text: the supplier's list may change, the order said what it said.
ALTER TABLE shopping_item ADD COLUMN delivery text CHECK (length(trim(delivery)) BETWEEN 1 AND 40);
