-- Neutral 4: a new installation is set up step by step; the canton new licence plates start with.

-- Until now fixed in the code: the workshop is in the canton of Zurich
ALTER TABLE company_profile ADD COLUMN plate_canton text NOT NULL DEFAULT 'ZH' CHECK (plate_canton ~ '^[A-Z]{2}$');

-- Empty until the setup assistant is finished (or skipped)
ALTER TABLE company_profile ADD COLUMN setup_completed_at timestamptz;

-- An installation in use is set up – it never sees the assistant
UPDATE company_profile SET setup_completed_at = now()
WHERE EXISTS (SELECT 1 FROM employee) OR EXISTS (SELECT 1 FROM customer) OR EXISTS (SELECT 1 FROM task);

-- A new one starts without Krügel's data (V12, V31) – the assistant asks for its own
UPDATE company_profile SET name = 'Meine Garage' WHERE setup_completed_at IS NULL;
UPDATE inspection_station SET name = 'Strassenverkehrsamt'
WHERE name = 'Strassenverkehrsamt Winterthur-Wülflingen'
  AND EXISTS (SELECT 1 FROM company_profile WHERE setup_completed_at IS NULL);
