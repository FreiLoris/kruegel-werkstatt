-- New tyres ordered for the customer (FB-25): a fifth kind of tyre change with what to order –
-- the dimension (may be open) and how many. The order position itself is on the shopping list.
ALTER TABLE task
    DROP CONSTRAINT task_tire_change_kind_check,
    ADD CONSTRAINT task_tire_change_kind_check
        CHECK (tire_change_kind IN ('WHEELS_STORED', 'TIRES_STORED', 'WHEELS_BROUGHT', 'TIRES_BROUGHT', 'NEW_TIRES')),
    ADD COLUMN new_tires_dimension text     CHECK (length(new_tires_dimension) BETWEEN 1 AND 40),
    ADD COLUMN new_tires_count     integer  CHECK (new_tires_count BETWEEN 1 AND 8),
    ADD CONSTRAINT task_new_tires_only_with_kind
        CHECK (tire_change_kind IS NOT DISTINCT FROM 'NEW_TIRES' OR (new_tires_dimension IS NULL AND new_tires_count IS NULL)),
    ADD CONSTRAINT task_new_tires_count CHECK (tire_change_kind <> 'NEW_TIRES' OR new_tires_count IS NOT NULL);

-- The tyres taken off are worn out: disposed of – kept with their history, no longer of the car
ALTER TABLE tire_set
    DROP CONSTRAINT tire_set_state_check,
    ADD CONSTRAINT tire_set_state_check CHECK (state IN ('IN_HOTEL', 'MOUNTED', 'WITH_CUSTOMER', 'DISPOSED'));

ALTER TABLE tire_set_event
    DROP CONSTRAINT tire_set_event_kind_check,
    ADD CONSTRAINT tire_set_event_kind_check
        CHECK (kind IN ('STORED', 'MEASURED', 'MOVED', 'RETRIEVED', 'RECORDED', 'MOUNTED', 'TAKEN_HOME', 'DISPOSED'));

-- disposing of it is taking it off too: still one set off per task
DROP INDEX tire_set_event_task_unique;
CREATE UNIQUE INDEX tire_set_event_task_unique ON tire_set_event (task_id, (kind IN ('RETRIEVED', 'MOUNTED')))
    WHERE task_id IS NOT NULL AND kind IN ('STORED', 'RETRIEVED', 'MOUNTED', 'TAKEN_HOME', 'DISPOSED');
