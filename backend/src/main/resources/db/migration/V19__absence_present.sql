-- "Anwesend" (12b): someone with flexible office hours enters when they are in. It is entered and
-- shown like an absence (person, from/to, half days, no overlap), so it is a fifth category of the
-- same table – the statistics leave it out.

ALTER TABLE absence DROP CONSTRAINT absence_category_check;
ALTER TABLE absence ADD CONSTRAINT absence_category_check
    CHECK (category IN ('VACATION', 'SICK', 'EXTERNAL_WORK', 'TRAINING', 'PRESENT'));
