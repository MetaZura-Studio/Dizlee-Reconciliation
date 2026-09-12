-- Append-only outbound email delivery log (SMTP handoff: SKIPPED / ACCEPTED / FAILED).
CREATE TABLE `email_deliveries` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `to_email` VARCHAR(255) NOT NULL,
  `from_email` VARCHAR(255) NULL,
  `subject` VARCHAR(255) NOT NULL,
  `purpose` VARCHAR(64) NOT NULL,
  `notification_id` BIGINT NULL,
  `status` VARCHAR(16) NOT NULL,
  `skip_reason` VARCHAR(32) NULL,
  `provider_message_id` VARCHAR(255) NULL,
  `error_code` VARCHAR(64) NULL,
  `error_message` TEXT NULL,
  `original_to_email` VARCHAR(255) NULL,
  `actor_user_id` BIGINT NULL,
  `correlation_id` VARCHAR(64) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `idx_email_deliveries_created_at` (`created_at`),
  INDEX `idx_email_deliveries_status_created` (`status`, `created_at`),
  INDEX `idx_email_deliveries_to_created` (`to_email`, `created_at`),
  INDEX `idx_email_deliveries_notification_id` (`notification_id`),
  INDEX `idx_email_deliveries_purpose_created` (`purpose`, `created_at`),
  CONSTRAINT `email_deliveries_notification_id_fkey`
    FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `email_deliveries_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
