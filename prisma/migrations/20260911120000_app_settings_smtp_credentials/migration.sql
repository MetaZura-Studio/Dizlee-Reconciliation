-- Admin-editable SMTP credentials (password stored encrypted at rest)
ALTER TABLE `app_settings`
  ADD COLUMN `smtp_user` VARCHAR(255) NULL,
  ADD COLUMN `smtp_password_enc` TEXT NULL;
