-- Partner RS% on service–partner maps + sent Partner Revenue Share reports.

ALTER TABLE `service_partner_maps`
  ADD COLUMN `partner_rs_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0;

CREATE TABLE `partner_revenue_share_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `partner_id` BIGINT NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `file_id` BIGINT NOT NULL,
    `reconciliation_id` INTEGER NULL,
    `sent_at` DATETIME(3) NOT NULL,
    `sent_by_user_id` BIGINT NOT NULL,
    `notification_id` BIGINT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `uq_partner_revenue_share_reports`
  ON `partner_revenue_share_reports`(`opco_id`, `partner_id`, `year`, `month`);

CREATE INDEX `idx_partner_rs_reports_period`
  ON `partner_revenue_share_reports`(`year`, `month`);

CREATE INDEX `idx_partner_rs_reports_partner_id`
  ON `partner_revenue_share_reports`(`partner_id`);

ALTER TABLE `partner_revenue_share_reports`
  ADD CONSTRAINT `partner_revenue_share_reports_opco_id_fkey`
  FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `partner_revenue_share_reports`
  ADD CONSTRAINT `partner_revenue_share_reports_partner_id_fkey`
  FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `partner_revenue_share_reports`
  ADD CONSTRAINT `partner_revenue_share_reports_file_id_fkey`
  FOREIGN KEY (`file_id`) REFERENCES `files`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `partner_revenue_share_reports`
  ADD CONSTRAINT `partner_revenue_share_reports_reconciliation_id_fkey`
  FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliations`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `partner_revenue_share_reports`
  ADD CONSTRAINT `partner_revenue_share_reports_sent_by_user_id_fkey`
  FOREIGN KEY (`sent_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `partner_revenue_share_reports`
  ADD CONSTRAINT `partner_revenue_share_reports_notification_id_fkey`
  FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `partner_revenue_share_report_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `partner_revenue_share_report_id` INTEGER NOT NULL,
    `service_name` VARCHAR(255) NOT NULL,
    `gross_revenue_lc` DECIMAL(18, 4) NOT NULL,
    `partner_rs_percent` DECIMAL(5, 2) NOT NULL,
    `partner_rs_amount_lc` DECIMAL(18, 4) NOT NULL,
    `sort_order` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `idx_partner_rs_report_items_report_id`
  ON `partner_revenue_share_report_items`(`partner_revenue_share_report_id`);

CREATE INDEX `idx_partner_rs_report_items_report_sort`
  ON `partner_revenue_share_report_items`(`partner_revenue_share_report_id`, `sort_order`);

ALTER TABLE `partner_revenue_share_report_items`
  ADD CONSTRAINT `partner_revenue_share_report_items_report_id_fkey`
  FOREIGN KEY (`partner_revenue_share_report_id`)
  REFERENCES `partner_revenue_share_reports`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
