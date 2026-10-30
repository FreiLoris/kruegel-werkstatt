-- Neutral 2: which public holidays the workshop has – until now fixed in the code (canton of Zurich).
-- Exactly one row; the chosen holidays by the name of HolidayRule.
CREATE TABLE public_holiday_settings (
    id          uuid        PRIMARY KEY,
    version     bigint      NOT NULL,
    created_at  timestamptz NOT NULL,
    updated_at  timestamptz NOT NULL,
    created_by  uuid        REFERENCES employee (id),
    updated_by  uuid        REFERENCES employee (id)
);

CREATE TABLE public_holiday_settings_rule (
    settings_id  uuid NOT NULL REFERENCES public_holiday_settings (id) ON DELETE CASCADE,
    rule         text NOT NULL CHECK (rule IN (
        'NEUJAHR', 'BERCHTOLDSTAG', 'DREIKOENIGSTAG', 'JOSEFSTAG', 'KARFREITAG', 'OSTERSONNTAG',
        'OSTERMONTAG', 'NAEFELSER_FAHRT', 'TAG_DER_ARBEIT', 'AUFFAHRT', 'PFINGSTSONNTAG', 'PFINGSTMONTAG',
        'FRONLEICHNAM', 'JURA_UNABHAENGIGKEIT', 'PETER_UND_PAUL', 'NATIONALFEIERTAG', 'MARIAE_HIMMELFAHRT',
        'GENFER_BETTAG', 'BETTAGSMONTAG', 'BRUDER_KLAUS', 'ALLERHEILIGEN', 'MARIAE_EMPFAENGNIS',
        'WEIHNACHTEN', 'STEPHANSTAG', 'RESTAURATION_GENF')),
    PRIMARY KEY (settings_id, rule)
);

-- Exactly the days the app had (canton of Zurich, with Easter and Whit Sunday) – a new workshop
-- changes them in the settings.
WITH settings AS (
    INSERT INTO public_holiday_settings (id, version, created_at, updated_at)
    VALUES (uuidv7(), 0, now(), now())
    RETURNING id
)
INSERT INTO public_holiday_settings_rule (settings_id, rule)
SELECT settings.id, rule
FROM settings, unnest(ARRAY['NEUJAHR', 'BERCHTOLDSTAG', 'KARFREITAG', 'OSTERSONNTAG', 'OSTERMONTAG',
    'TAG_DER_ARBEIT', 'AUFFAHRT', 'PFINGSTSONNTAG', 'PFINGSTMONTAG', 'NATIONALFEIERTAG', 'WEIHNACHTEN',
    'STEPHANSTAG']) AS rule;
