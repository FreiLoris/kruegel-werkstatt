-- 17d: reminders by SMS only (decided 2026-10-29). A customer reached by e-mail before is one to call
-- now – the reminder was only logged anyway (no mail account was ever set up).
UPDATE task_reminder SET channel = NULL, outcome = 'NO_CONTACT', error = NULL WHERE channel = 'EMAIL';

ALTER TABLE task_reminder DROP CONSTRAINT task_reminder_channel_check;
ALTER TABLE task_reminder ADD CONSTRAINT task_reminder_channel_check CHECK (channel = 'SMS');
