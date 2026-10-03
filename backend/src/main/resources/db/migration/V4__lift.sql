-- Hebebühnen der Werkstatt. Früher fest "Lift 1/2/3" an über einem Dutzend Stellen im Code (Bug #13),
-- jetzt Stammdaten: Anzahl und Namen sind in der App änderbar.

CREATE TABLE lift (
    id             uuid         PRIMARY KEY,
    version        bigint       NOT NULL,
    erstellt_am    timestamptz  NOT NULL,
    geaendert_am   timestamptz  NOT NULL,
    erstellt_von   uuid         REFERENCES mitarbeiter (id),
    geaendert_von  uuid         REFERENCES mitarbeiter (id),

    -- Anzeigename, z. B. "Lift 1" oder "Grube"
    name           text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 30),
    -- Stillgelegte Lifts bleiben erhalten: alte Aufträge zeigen weiterhin, wo sie waren
    aktiv          boolean      NOT NULL,
    -- Reihenfolge der Spalten in Tagesansicht und Dashboard
    reihenfolge    integer      NOT NULL
);

CREATE UNIQUE INDEX lift_name_aktiv_eindeutig ON lift (lower(trim(name))) WHERE aktiv;

-- Ausgangslage wie in der alten App. Echte Stammdaten (keine Testdaten) – jede Installation braucht Lifts.
INSERT INTO lift (id, version, erstellt_am, geaendert_am, name, aktiv, reihenfolge) VALUES
    (uuidv7(), 0, now(), now(), 'Lift 1', true, 0),
    (uuidv7(), 0, now(), now(), 'Lift 2', true, 1),
    (uuidv7(), 0, now(), now(), 'Lift 3', true, 2);
