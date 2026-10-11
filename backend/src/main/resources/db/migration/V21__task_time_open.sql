-- "Zeit offen" (12d-2): the day is fixed, the clock time is not – the workshop does not know yet
-- when the car comes. The task keeps its start and end (they reserve the lift and place the block
-- in the day view), but people see "Zeit offen" instead of a time that looks like a promise.
ALTER TABLE task ADD COLUMN time_open boolean NOT NULL DEFAULT false;
