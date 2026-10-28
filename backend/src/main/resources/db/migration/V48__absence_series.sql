-- FB-33: recurring absences (e.g. three months of external work every Mon, Tue and Thu) – entered in
-- one go as single days that belong together: changed or deleted per day, from a day on or as a whole.
ALTER TABLE absence ADD COLUMN series_id uuid;

CREATE INDEX absence_series ON absence (series_id) WHERE series_id IS NOT NULL;
