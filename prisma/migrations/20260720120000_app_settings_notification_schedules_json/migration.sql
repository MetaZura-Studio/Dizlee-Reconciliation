-- Reminder Settings schedule JSON (intimations/reminders day-of-month config).
ALTER TABLE `app_settings` ADD COLUMN `notification_schedules_json` TEXT NULL;
