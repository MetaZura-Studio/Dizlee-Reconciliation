-- Link reminder (and other) fan-out notifications to email_deliveries.correlation_id
ALTER TABLE `notifications`
  ADD COLUMN `email_correlation_id` VARCHAR(64) NULL;

CREATE INDEX `idx_notifications_email_correlation_id`
  ON `notifications` (`email_correlation_id`);
