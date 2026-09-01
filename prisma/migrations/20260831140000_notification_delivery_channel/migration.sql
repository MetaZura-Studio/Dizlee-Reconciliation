-- Delivery channel for notifications: SYSTEM (in-app), EMAIL, or BOTH.
ALTER TABLE `notifications`
  ADD COLUMN `delivery_channel` VARCHAR(16) NOT NULL DEFAULT 'SYSTEM';
