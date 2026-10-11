-- "Wer ist heute da?" on the dashboard (12h): most people are in on every working day unless an
-- absence says otherwise. Someone with flexible hours (e.g. the office, part-time) is the other
-- way round: only in on the days entered as "Anwesend". A setting per person, not a name in the code.
ALTER TABLE employee ADD COLUMN flexible_hours boolean NOT NULL DEFAULT false;
