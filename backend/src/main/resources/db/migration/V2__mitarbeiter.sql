-- Mitarbeiterinnen und Mitarbeiter der Werkstatt.
-- Werden überall als Person ausgewählt: Mechaniker im Auftrag, Pinnwand-Spalten, To-dos, Abwesenheiten.

CREATE TABLE mitarbeiter (
    id                      uuid         PRIMARY KEY,
    version                 bigint       NOT NULL,
    erstellt_am             timestamptz  NOT NULL,
    geaendert_am            timestamptz  NOT NULL,

    -- Anzeigename, wie im Betrieb üblich (z. B. "Reto", "Döme")
    name                    text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
    rolle                   text         NOT NULL CHECK (rolle IN ('GESCHAEFTSFUEHRUNG', 'MECHANIKER', 'BUERO', 'LERNENDER', 'PRAKTIKUM')),
    -- Farbe für Pinnwand-Spalte, Kalender und Namens-Badges, z. B. "#f6d860"
    farbe                   text         NOT NULL CHECK (farbe ~ '^#[0-9a-f]{6}$'),
    geburtstag              date,
    ferienanspruch          integer      NOT NULL CHECK (ferienanspruch BETWEEN 0 AND 60),

    -- Wo die Person zur Auswahl steht (keine Zugriffsrechte – es gibt kein Login)
    als_mechaniker_waehlbar boolean      NOT NULL,
    fuer_aufgaben_waehlbar  boolean      NOT NULL,
    pinnwand_spalte         boolean      NOT NULL,

    -- Ehemalige werden deaktiviert statt gelöscht: alte Aufträge zeigen weiterhin ihren Namen
    aktiv                   boolean      NOT NULL,
    -- Feste Reihenfolge für Spalten und Listen (überall gleich – UI-Review: Pinnwand vs. Dashboard)
    reihenfolge             integer      NOT NULL
);

-- Unter den aktiven Mitarbeitern ist jeder Name eindeutig (Gross-/Kleinschreibung egal).
-- Ein ehemaliger "Reto" blockiert keinen neuen "Reto".
CREATE UNIQUE INDEX mitarbeiter_name_aktiv_eindeutig ON mitarbeiter (lower(trim(name))) WHERE aktiv;
