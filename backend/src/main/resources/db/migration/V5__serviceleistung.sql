-- Leistungen, die bei einem Service angekreuzt werden (Ölwechsel, Wischblätter, …).
-- Früher 8 fest eingebaute Checkboxen, jetzt in der App pflegbar.

CREATE TABLE serviceleistung (
    id             uuid         PRIMARY KEY,
    version        bigint       NOT NULL,
    erstellt_am    timestamptz  NOT NULL,
    geaendert_am   timestamptz  NOT NULL,
    erstellt_von   uuid         REFERENCES mitarbeiter (id),
    geaendert_von  uuid         REFERENCES mitarbeiter (id),

    name           text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
    -- Nicht mehr angebotene Leistungen bleiben erhalten: alte Aufträge zeigen sie weiterhin
    aktiv          boolean      NOT NULL,
    -- Reihenfolge der Checkboxen im Auftrag und auf dem Auftragszettel
    reihenfolge    integer      NOT NULL
);

CREATE UNIQUE INDEX serviceleistung_name_aktiv_eindeutig ON serviceleistung (lower(trim(name))) WHERE aktiv;

-- Ausgangslage wie in der alten App (echte Stammdaten, keine Testdaten).
INSERT INTO serviceleistung (id, version, erstellt_am, geaendert_am, name, aktiv, reihenfolge) VALUES
    (uuidv7(), 0, now(), now(), 'Ölwechsel',        true, 0),
    (uuidv7(), 0, now(), now(), 'Wischblätter',     true, 1),
    (uuidv7(), 0, now(), now(), 'Klimaservice',     true, 2),
    (uuidv7(), 0, now(), now(), 'Bremsen',          true, 3),
    (uuidv7(), 0, now(), now(), 'Lenkgeometrie',    true, 4),
    (uuidv7(), 0, now(), now(), 'Abgastest',        true, 5),
    (uuidv7(), 0, now(), now(), 'Innenreinigung',   true, 6),
    (uuidv7(), 0, now(), now(), 'Fahrzeug waschen', true, 7);
