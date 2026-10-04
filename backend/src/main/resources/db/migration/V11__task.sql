-- Tasks (Auftrag/Termin) – the core of the app: who brings which vehicle when, what is done,
-- who works on it on which lift. One entity for appointment and job, like in the old app.
--
-- Old app: one JSON blob per task with free text for customer, vehicle and mechanic.
-- Now: references to customer, vehicle, employee and lift; status and "waiting customer"
-- are two separate things (bug #4: status/flag mix-up).

CREATE TABLE task (
    id                  uuid         PRIMARY KEY,
    version             bigint       NOT NULL,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    created_by          uuid         REFERENCES employee (id),
    updated_by          uuid         REFERENCES employee (id),

    -- SwissGarage order number, entered by hand later; unique (index below)
    task_number         text         CHECK (length(task_number) BETWEEN 1 AND 30),

    customer_id         uuid         NOT NULL REFERENCES customer (id),
    -- May still be open, e.g. a new car that is not in SwissGarage yet
    vehicle_id          uuid         REFERENCES vehicle (id),

    -- Appointment in Swiss local time (no time zone: a workshop appointment is "08:00 here")
    appointment_date    date         NOT NULL,
    appointment_time    time         NOT NULL,
    -- "Fahrzeug kommt früher" (e.g. the evening before) and "fertig bis"
    arrives_earlier     timestamp,
    ready_by            timestamp,
    -- Customer waits on site – a flag, NOT a status
    waiting_customer    boolean      NOT NULL,

    -- Both may be open at first; kept when an employee leaves or a lift is shut down
    mechanic_id         uuid         REFERENCES employee (id),
    lift_id             uuid         REFERENCES lift (id),

    status              text         NOT NULL
                                     CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'DONE')),

    -- Work: tire change with kind, MFK with its appointment at the inspection station
    tire_change         boolean      NOT NULL,
    tire_change_kind    text         CHECK (tire_change_kind IN ('WHEELS_STORED', 'TIRES_STORED', 'WHEELS_BROUGHT', 'TIRES_BROUGHT')),
    mfk                 boolean      NOT NULL,
    mfk_appointment     timestamp,
    work_description    text         CHECK (length(work_description) <= 2000),
    notes               text         CHECK (length(notes) <= 2000),

    -- Parts to order: all empty = no parts needed
    parts_description   text         CHECK (length(parts_description) BETWEEN 1 AND 500),
    parts_status        text         CHECK (parts_status IN ('TO_ORDER', 'ORDERED', 'ARRIVED')),
    parts_supplier      text         CHECK (length(parts_supplier) BETWEEN 1 AND 100),
    parts_ordered_on    date,

    -- Order of the cards within one lift column of a day
    sort_order          integer      NOT NULL,

    CHECK (tire_change OR tire_change_kind IS NULL),
    CHECK (mfk OR mfk_appointment IS NULL),
    CHECK ((parts_description IS NULL) = (parts_status IS NULL)),
    CHECK (parts_description IS NOT NULL OR (parts_supplier IS NULL AND parts_ordered_on IS NULL)),
    CHECK (arrives_earlier < appointment_date + appointment_time),
    CHECK (ready_by > appointment_date + appointment_time)
);

CREATE UNIQUE INDEX task_task_number_unique ON task (task_number) WHERE task_number IS NOT NULL;

-- Day/week views: tasks of a period, per lift in order
CREATE INDEX task_appointment ON task (appointment_date, lift_id, sort_order);
-- Customer/vehicle history (wizard step 1, task detail)
CREATE INDEX task_customer ON task (customer_id);
CREATE INDEX task_vehicle ON task (vehicle_id);


-- Ticked service items (Ölwechsel, Wischblätter, …) – admin-maintained list instead of 8 fixed texts
CREATE TABLE task_service_item (
    task_id             uuid         NOT NULL REFERENCES task (id) ON DELETE CASCADE,
    service_item_id     uuid         NOT NULL REFERENCES service_item (id),
    PRIMARY KEY (task_id, service_item_id)
);
