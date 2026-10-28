-- A former customer (FB-27, decided by the workshop 2026-10-28): blocked or former in SwissGarage,
-- but still the holder of a vehicle – imported so the vehicle has its holder, and marked so the
-- search shows them greyed, after the others. Set by the address list import only.
ALTER TABLE customer ADD COLUMN former boolean NOT NULL DEFAULT false;
