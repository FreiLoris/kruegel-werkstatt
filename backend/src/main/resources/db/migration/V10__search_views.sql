-- One lower-case search text per active vehicle and per customer – the customer search
-- (wizard step 1) checks that every typed word occurs in it.
-- Plates and phone numbers also without spaces, so "zh123456" finds "ZH 123456".
-- No index: ~1500 customers / ~3000 vehicles are searched in a few milliseconds.

CREATE VIEW vehicle_search AS
SELECT v.id,
       v.customer_id,
       lower(concat_ws(' ',
           v.license_plate, replace(v.license_plate, ' ', ''),
           v.make, v.model, v.vin, v.swissgarage_number)) AS search_text
FROM vehicle v
WHERE v.active;

CREATE VIEW customer_search AS
SELECT c.id,
       lower(concat_ws(' ',
           c.last_name, c.first_name, c.company, c.addition,
           c.street, c.postal_code, c.city,
           c.phone, replace(c.phone, ' ', ''), c.mobile, replace(c.mobile, ' ', ''),
           c.email, c.swissgarage_number,
           -- the customer's vehicles: a plate finds its holder
           (SELECT string_agg(vs.search_text, ' ') FROM vehicle_search vs WHERE vs.customer_id = c.id)
       )) AS search_text
FROM customer c
WHERE c.active;
