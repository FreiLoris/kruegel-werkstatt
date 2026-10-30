-- Neutral 3: parts of the app a workshop may switch off – gone from the menu, the settings and the
-- task; their data stays. Exactly one row; the modules OFF by the name of AppModule – none at first,
-- the app stays as it was.
CREATE TABLE module_settings (
    id          uuid        PRIMARY KEY,
    version     bigint      NOT NULL,
    created_at  timestamptz NOT NULL,
    updated_at  timestamptz NOT NULL,
    created_by  uuid        REFERENCES employee (id),
    updated_by  uuid        REFERENCES employee (id)
);

CREATE TABLE module_settings_off (
    settings_id  uuid NOT NULL REFERENCES module_settings (id) ON DELETE CASCADE,
    module       text NOT NULL CHECK (module IN (
        'COURTESY_CARS', 'TIRE_HOTEL', 'MFK', 'BOARD', 'MATERIAL', 'STATISTICS')),
    PRIMARY KEY (settings_id, module)
);

INSERT INTO module_settings (id, version, created_at, updated_at)
VALUES (uuidv7(), 0, now(), now());
