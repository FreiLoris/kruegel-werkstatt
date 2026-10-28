-- A short code to write on the shelf (FB-23, scheme of the workshop 2026-10-28): AA00 – the area
-- (K = Keller), the place in it (A, B, C …), the number in that place (01, 02 …). Given by hand (a
-- free one proposed), not derived from the tree: a renamed or moved place keeps its label. Any
-- level may have one; one without shows the code of the nearest place above it.
ALTER TABLE storage_location ADD COLUMN code text CHECK (code ~ '^[A-Z]{2}[0-9]{2}$');

-- once on the whole premises – also on a place not in use any more: its label may still hang there
CREATE UNIQUE INDEX storage_location_code_unique ON storage_location (code) WHERE code IS NOT NULL;
