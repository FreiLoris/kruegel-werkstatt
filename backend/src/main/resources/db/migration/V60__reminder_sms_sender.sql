-- Neutral 1: the name the customer's phone shows as the sender of the reminder – until now fixed in
-- the code ("Kruegel"). Empty = taken from the company name ("Krügel Fahrzeugtechnik" → "Kruegel").
ALTER TABLE reminder_settings ADD COLUMN sms_sender text
    CHECK (sms_sender ~ '^[A-Za-z0-9]{1,11}$' AND sms_sender ~ '[A-Za-z]');

-- An installation in use keeps exactly the sender its customers know, whatever its company name becomes.
-- A new one (no employees yet) takes it from its company name.
UPDATE reminder_settings SET sms_sender = 'Kruegel' WHERE EXISTS (SELECT 1 FROM employee);
