-- FB-31: return labels need the supplier's address – and its address for returns when that is
-- another one (e.g. a central warehouse). Both optional.
ALTER TABLE supplier
    ADD COLUMN street              text CHECK (length(street) <= 100),
    ADD COLUMN postal_code         text CHECK (length(postal_code) <= 10),
    ADD COLUMN city                text CHECK (length(city) <= 100),
    ADD COLUMN return_name         text CHECK (length(return_name) <= 100),
    ADD COLUMN return_street       text CHECK (length(return_street) <= 100),
    ADD COLUMN return_postal_code  text CHECK (length(return_postal_code) <= 10),
    ADD COLUMN return_city         text CHECK (length(return_city) <= 100);
