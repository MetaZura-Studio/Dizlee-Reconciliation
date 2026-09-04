-- Persist when Dizlee alerts OpCo/Partner on a reconciliation (Re-run gate)

ALTER TABLE `reconciliations`
  ADD COLUMN `alerted_at` DATETIME(3) NULL,
  ADD COLUMN `alerted_by_user_id` BIGINT NULL;

ALTER TABLE `reconciliations`
  ADD CONSTRAINT `reconciliations_alerted_by_user_id_fkey`
  FOREIGN KEY (`alerted_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
