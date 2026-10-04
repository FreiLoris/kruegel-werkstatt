-- The workshop's own data: name, address and logo – shown in the navigation and as letterhead
-- on the task sheet. Exactly ONE row: created here, afterwards only edited in the settings.

CREATE TABLE company_profile (
    id                  uuid         PRIMARY KEY,
    version             bigint       NOT NULL,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    created_by          uuid         REFERENCES employee (id),
    updated_by          uuid         REFERENCES employee (id),

    -- Only "true" is allowed and it is unique → a second row is impossible
    singleton           boolean      NOT NULL DEFAULT true UNIQUE CHECK (singleton),

    name                text         NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
    street              text         CHECK (length(street) <= 100),
    postal_code         text         CHECK (length(postal_code) <= 10),
    city                text         CHECK (length(city) <= 60),
    phone               text         CHECK (length(phone) <= 30),
    email               text         CHECK (length(email) <= 100),
    website             text         CHECK (length(website) <= 100),

    -- Logo: NOT mapped in the entity (it would be loaded with every access), read and written
    -- with SQL. Max. 1 MB; the type is detected from the file content, not from the file name.
    logo                bytea        CHECK (octet_length(logo) <= 1048576),
    logo_content_type   text         CHECK (logo_content_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')),
    logo_updated_at     timestamptz,

    CHECK ((logo IS NULL) = (logo_content_type IS NULL)),
    CHECK ((logo IS NULL) = (logo_updated_at IS NULL))
);

INSERT INTO company_profile (id, version, created_at, updated_at, name)
VALUES (uuidv7(), 0, now(), now(), 'Krügel Fahrzeugtechnik');
