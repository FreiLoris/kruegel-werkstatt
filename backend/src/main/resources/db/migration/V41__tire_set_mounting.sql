-- What the mechanic needs to mount a set (FB-11): the torque of the wheel bolts and the tyre
-- pressure front/rear. Per set – summer and winter wheels may need other values. All optional.
ALTER TABLE tire_set
    ADD COLUMN torque         integer       CHECK (torque BETWEEN 10 AND 999),
    ADD COLUMN pressure_front numeric(3, 2) CHECK (pressure_front BETWEEN 0.5 AND 9.99),
    ADD COLUMN pressure_rear  numeric(3, 2) CHECK (pressure_rear BETWEEN 0.5 AND 9.99);

-- FB-17: wheel_bolts no longer means "stored with the set" but "watch the wheel bolts" (special
-- bolts, the mechanic looks for the matching ones in the car). Only the meaning changes.
COMMENT ON COLUMN tire_set.wheel_bolts IS 'Radschrauben beachten: look for the matching bolts in the car (FB-17)';
