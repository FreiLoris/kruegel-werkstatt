-- FB-30: a supplier has several contacts (departments: Verkauf Innendienst, Werkzeuge, Reifen …) and
-- several ways of delivery (Tagesexpress, Nachtexpress, tours with their order deadline …).
-- Phone and e-mail of the supplier stay as its main line ("Zentrale"); the one contact person so far
-- becomes the first contact. The old free text "Lieferzeit / Touren" stays as a remark.

CREATE TABLE supplier_contact (
    supplier_id  uuid     NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
    position     integer  NOT NULL CHECK (position >= 0),
    department   text     CHECK (length(department) <= 100),
    name         text     CHECK (length(name) <= 100),
    phone        text     CHECK (length(phone) <= 40),
    mobile       text     CHECK (length(mobile) <= 40),
    email        text     CHECK (length(email) <= 100),
    remark       text     CHECK (length(remark) <= 300),
    -- an empty line is no contact
    CHECK (coalesce(department, name, phone, mobile, email) IS NOT NULL),

    PRIMARY KEY (supplier_id, position)
);

INSERT INTO supplier_contact (supplier_id, position, name)
SELECT id, 0, contact_person FROM supplier WHERE contact_person IS NOT NULL;

ALTER TABLE supplier DROP COLUMN contact_person;

CREATE TABLE supplier_delivery (
    supplier_id       uuid          NOT NULL REFERENCES supplier (id) ON DELETE CASCADE,
    position          integer       NOT NULL CHECK (position >= 0),
    -- e.g. Tagesexpress, Nachtexpress, Standardversand, Abholung, Kurier – free, with suggestions
    kind              text          NOT NULL CHECK (length(trim(kind)) BETWEEN 1 AND 40),
    order_deadline    time,
    tour              text          CHECK (length(tour) <= 60),
    arrival           time,
    -- "nächster Morgen 07:30"
    arrival_next_day  boolean       NOT NULL,
    postage           numeric(8, 2) CHECK (postage >= 0),
    remark            text          CHECK (length(remark) <= 200),

    PRIMARY KEY (supplier_id, position)
);
