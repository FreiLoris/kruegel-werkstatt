-- FB-05: absences with clock times – a doctor 9:00–10:30, a course until 15:00. For every kind
-- except vacation (decided with the workshop 2026-10-14): the vacation statistics count half days,
-- so vacation keeps "ab Mittag" / "bis Mittag". Without a time a day counts as before (whole day).
ALTER TABLE absence
    ADD COLUMN start_time time,
    ADD COLUMN end_time   time;

-- the half days entered so far (other than vacation) become the same moment as a time: noon
UPDATE absence SET start_time = time '12:00', starts_afternoon = false WHERE category <> 'VACATION' AND starts_afternoon;
UPDATE absence SET end_time = time '12:00', ends_noon = false WHERE category <> 'VACATION' AND ends_noon;

ALTER TABLE absence
    -- vacation: half days, no times – everything else: times, no half days
    ADD CHECK (category <> 'VACATION' OR (start_time IS NULL AND end_time IS NULL)),
    ADD CHECK (category = 'VACATION' OR (NOT starts_afternoon AND NOT ends_noon)),
    -- "until 00:00" would end before the last day starts
    ADD CHECK (end_time IS NULL OR end_time > time '00:00'),
    ADD CHECK (start_date <> end_date OR start_time IS NULL OR end_time IS NULL OR end_time > start_time);

-- nothing twice at the same time – now to the minute
ALTER TABLE absence DROP CONSTRAINT absence_no_overlap;
ALTER TABLE absence ADD CONSTRAINT absence_no_overlap EXCLUDE USING gist (
    employee_id WITH =,
    tsrange(start_date + coalesce(start_time, CASE WHEN starts_afternoon THEN time '12:00' ELSE time '00:00' END),
            CASE WHEN end_time IS NOT NULL THEN end_date + end_time
                 WHEN ends_noon THEN end_date + time '12:00'
                 ELSE (end_date + 1) + time '00:00' END, '[)') WITH &&
);
