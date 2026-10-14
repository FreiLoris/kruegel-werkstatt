-- Storage locations as a tree (13f, feedback 2026-10-14): nested as deep as needed, e.g.
-- 1. OG › Büro › Regal 2 › Schublade 3. Existing places become top-level ones.
ALTER TABLE storage_location ADD COLUMN parent_id uuid REFERENCES storage_location (id);

CREATE INDEX storage_location_parent ON storage_location (parent_id);

-- a name once per level: "Lager" may be under "EG" and under "1. OG", but not twice under "EG"
-- (NULLS NOT DISTINCT: also only once at the top level)
DROP INDEX storage_location_active_name_unique;
CREATE UNIQUE INDEX storage_location_active_name_unique
    ON storage_location (parent_id, lower(trim(name))) NULLS NOT DISTINCT WHERE active;

-- the order is per level now (among the places with the same parent)
COMMENT ON COLUMN storage_location.sort_order IS 'order among the places with the same parent';
