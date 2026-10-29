-- Dizlee-controlled gate: Partner portal invoice upload (default open).
ALTER TABLE `partners`
  ADD COLUMN `invoice_upload_enabled` BOOLEAN NOT NULL DEFAULT true;
