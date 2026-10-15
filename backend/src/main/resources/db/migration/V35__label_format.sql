-- Label sheets for the tyre hotel (FB-07): A4 sheets with labels for the four wheels, printed with
-- a normal printer. The layout of a sheet in mm – the workshop adds its own formats in the settings.
-- A single-label printer may be bought later: then a format of 1 × 1 on its own page size follows.
CREATE TABLE label_format (
    id            uuid          PRIMARY KEY,
    version       bigint        NOT NULL,
    created_at    timestamptz   NOT NULL,
    updated_at    timestamptz   NOT NULL,
    created_by    uuid          REFERENCES employee (id),
    updated_by    uuid          REFERENCES employee (id),

    name          text          NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
    columns       integer       NOT NULL CHECK (columns BETWEEN 1 AND 10),
    rows          integer       NOT NULL CHECK (rows BETWEEN 1 AND 30),
    width_mm      numeric(5, 2) NOT NULL CHECK (width_mm BETWEEN 10 AND 210),
    height_mm     numeric(5, 2) NOT NULL CHECK (height_mm BETWEEN 10 AND 297),
    -- from the top left corner of the sheet to the first label
    margin_top    numeric(5, 2) NOT NULL CHECK (margin_top BETWEEN 0 AND 60),
    margin_left   numeric(5, 2) NOT NULL CHECK (margin_left BETWEEN 0 AND 60),
    -- space between two labels side by side / one below the other
    gap_x         numeric(5, 2) NOT NULL CHECK (gap_x BETWEEN 0 AND 30),
    gap_y         numeric(5, 2) NOT NULL CHECK (gap_y BETWEEN 0 AND 30),
    sort_order    integer       NOT NULL
);

CREATE UNIQUE INDEX label_format_name_unique ON label_format (lower(trim(name)));

-- Common formats – to be checked once with a test print, printers differ
INSERT INTO label_format (id, version, created_at, updated_at, name, columns, rows, width_mm, height_mm, margin_top, margin_left, gap_x, gap_y, sort_order)
VALUES
    (uuidv7(), 0, now(), now(), 'Avery Zweckform 3474 – 24 pro Bogen (70 × 37 mm)', 3, 8, 70, 37, 0.5, 0, 0, 0, 0),
    (uuidv7(), 0, now(), now(), 'Avery Zweckform 3666 – 65 pro Bogen (38 × 21,2 mm)', 5, 13, 38, 21.2, 10.7, 4.7, 2.5, 0, 1),
    (uuidv7(), 0, now(), now(), 'Herma 4610 – 40 pro Bogen (52,5 × 29,7 mm)', 4, 10, 52.5, 29.7, 0, 0, 0, 0, 2);
