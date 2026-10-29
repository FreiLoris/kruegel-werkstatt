-- 17e: the workshop's own wording of the reminder, with placeholders ({Anrede}, {Termin}, …); empty =
-- the app's standard text.
ALTER TABLE reminder_settings ADD COLUMN sms_template text CHECK (length(sms_template) <= 600);
