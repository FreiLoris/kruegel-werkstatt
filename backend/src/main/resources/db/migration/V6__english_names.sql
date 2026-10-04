-- Code language switches to English (roadmap step 4r, ADR 0002): tables, columns and stored
-- enum values get English names. The app itself stays German (UI texts are not stored here).
-- Earlier migrations stay untouched – they describe how the schema was built.

-- ── Tables ──────────────────────────────────────────────────────────────
ALTER TABLE mitarbeiter     RENAME TO employee;
ALTER TABLE serviceleistung RENAME TO service_item;

-- ── Columns every table has (BaseEntity) ───────────────────────────────
ALTER TABLE employee     RENAME COLUMN erstellt_am   TO created_at;
ALTER TABLE employee     RENAME COLUMN geaendert_am  TO updated_at;
ALTER TABLE employee     RENAME COLUMN erstellt_von  TO created_by;
ALTER TABLE employee     RENAME COLUMN geaendert_von TO updated_by;
ALTER TABLE lift         RENAME COLUMN erstellt_am   TO created_at;
ALTER TABLE lift         RENAME COLUMN geaendert_am  TO updated_at;
ALTER TABLE lift         RENAME COLUMN erstellt_von  TO created_by;
ALTER TABLE lift         RENAME COLUMN geaendert_von TO updated_by;
ALTER TABLE service_item RENAME COLUMN erstellt_am   TO created_at;
ALTER TABLE service_item RENAME COLUMN geaendert_am  TO updated_at;
ALTER TABLE service_item RENAME COLUMN erstellt_von  TO created_by;
ALTER TABLE service_item RENAME COLUMN geaendert_von TO updated_by;

-- ── Columns of the business tables ─────────────────────────────────────
ALTER TABLE employee RENAME COLUMN rolle                   TO role;
ALTER TABLE employee RENAME COLUMN farbe                   TO color;
ALTER TABLE employee RENAME COLUMN geburtstag              TO birthday;
ALTER TABLE employee RENAME COLUMN ferienanspruch          TO vacation_days_per_year;
ALTER TABLE employee RENAME COLUMN als_mechaniker_waehlbar TO selectable_as_mechanic;
ALTER TABLE employee RENAME COLUMN fuer_aufgaben_waehlbar  TO selectable_for_todos;
ALTER TABLE employee RENAME COLUMN pinnwand_spalte         TO has_pinboard_column;
ALTER TABLE employee RENAME COLUMN aktiv                   TO active;
ALTER TABLE employee RENAME COLUMN reihenfolge             TO sort_order;

ALTER TABLE lift RENAME COLUMN aktiv       TO active;
ALTER TABLE lift RENAME COLUMN reihenfolge TO sort_order;

ALTER TABLE service_item RENAME COLUMN aktiv       TO active;
ALTER TABLE service_item RENAME COLUMN reihenfolge TO sort_order;

-- ── Stored role values ─────────────────────────────────────────────────
-- The check constraint lists the allowed values, so it has to be replaced, not renamed.
ALTER TABLE employee DROP CONSTRAINT mitarbeiter_rolle_check;

UPDATE employee SET role = CASE role
    WHEN 'GESCHAEFTSFUEHRUNG' THEN 'MANAGEMENT'
    WHEN 'MECHANIKER'         THEN 'MECHANIC'
    WHEN 'BUERO'              THEN 'OFFICE'
    WHEN 'LERNENDER'          THEN 'APPRENTICE'
    WHEN 'PRAKTIKUM'          THEN 'INTERN'
END;

ALTER TABLE employee ADD CONSTRAINT employee_role_check
    CHECK (role IN ('MANAGEMENT', 'MECHANIC', 'OFFICE', 'APPRENTICE', 'INTERN'));

-- ── Names of constraints and indexes ───────────────────────────────────
-- Renaming a table or column does not rename its constraints/indexes
-- (e.g. "mitarbeiter_farbe_check"). They show up in error messages and logs, so translate
-- every German part of their names. Order matters: longer terms first.
DO $$
DECLARE
    terms CONSTANT text[][] := ARRAY[
        ['serviceleistung',         'service_item'],
        ['mitarbeiter',             'employee'],
        ['als_mechaniker_waehlbar', 'selectable_as_mechanic'],
        ['fuer_aufgaben_waehlbar',  'selectable_for_todos'],
        ['pinnwand_spalte',         'has_pinboard_column'],
        ['ferienanspruch',          'vacation_days_per_year'],
        ['geburtstag',              'birthday'],
        ['farbe',                   'color'],
        ['rolle',                   'role'],
        ['reihenfolge',             'sort_order'],
        ['erstellt_am',             'created_at'],
        ['geaendert_am',            'updated_at'],
        ['erstellt_von',            'created_by'],
        ['geaendert_von',           'updated_by'],
        ['name_aktiv_eindeutig',    'name_active_unique'],
        ['aktiv',                   'active']
    ];
    item   record;
    target text;
    i      int;
BEGIN
    -- Constraints (primary keys, foreign keys, checks, not-null)
    FOR item IN
        SELECT c.conrelid::regclass::text AS tab, c.conname AS name, c.contype AS type
        FROM pg_constraint c
        WHERE c.conrelid IN ('employee'::regclass, 'lift'::regclass, 'service_item'::regclass)
    LOOP
        target := item.name;
        FOR i IN 1 .. array_length(terms, 1) LOOP
            target := replace(target, terms[i][1], terms[i][2]);
        END LOOP;
        IF target <> item.name THEN
            -- Primary keys are backed by an index of the same name; renaming the constraint
            -- renames that index too.
            EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', item.tab, item.name, target);
        END IF;
    END LOOP;

    -- Indexes that are not constraints (the "name unique among active ones" indexes)
    FOR item IN
        SELECT indexname AS name
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename IN ('employee', 'lift', 'service_item')
          AND indexname NOT LIKE '%\_pkey'
    LOOP
        target := item.name;
        FOR i IN 1 .. array_length(terms, 1) LOOP
            target := replace(target, terms[i][1], terms[i][2]);
        END LOOP;
        IF target <> item.name THEN
            EXECUTE format('ALTER INDEX %I RENAME TO %I', item.name, target);
        END IF;
    END LOOP;
END $$;
