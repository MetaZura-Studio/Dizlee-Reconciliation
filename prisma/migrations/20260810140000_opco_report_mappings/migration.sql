-- Per-OpCo Admin report column mappings (sample headers + field map)

CREATE TABLE `opco_report_mappings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `sample_file_id` BIGINT NULL,
    `headers_json` TEXT NULL,
    `service_column` VARCHAR(255) NULL,
    `partner_mode` VARCHAR(32) NOT NULL DEFAULT 'UPLOAD_PICKER',
    `partner_column` VARCHAR(255) NULL,
    `revenue_column` VARCHAR(255) NULL,
    `revenue_share_column` VARCHAR(255) NULL,
    `aggregate_daily_rows` BOOLEAN NOT NULL DEFAULT false,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `opco_report_mappings_opco_id_key`(`opco_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `opco_report_mappings` ADD CONSTRAINT `opco_report_mappings_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `opco_report_mappings` ADD CONSTRAINT `opco_report_mappings_sample_file_id_fkey` FOREIGN KEY (`sample_file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `opco_report_mappings` ADD CONSTRAINT `opco_report_mappings_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `opco_report_mappings` ADD CONSTRAINT `opco_report_mappings_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed defaults mirroring previous hardcoded Appendix A behavior
INSERT INTO `opco_report_mappings` (
  `opco_id`, `partner_mode`, `partner_column`, `service_column`, `revenue_column`,
  `aggregate_daily_rows`, `headers_json`, `created_at`, `updated_at`, `is_deleted`
)
SELECT o.`id`,
  CASE
    WHEN LOWER(o.`name`) IN ('zain iraq', 'zain sudan') THEN 'SERVICE_PARTNER_MAP'
    WHEN LOWER(o.`name`) = 'zain south sudan' THEN 'UPLOAD_PICKER'
    ELSE 'EXCEL_COLUMN'
  END,
  CASE
    WHEN LOWER(o.`name`) IN ('zain bahrain', 'zain jordan') THEN 'Merchant Name'
    WHEN LOWER(o.`name`) IN ('zain ksa', 'zain saudi arabia') THEN 'VENDORNAME'
    WHEN LOWER(o.`name`) = 'zain kuwait' THEN 'Service provider Name'
    ELSE NULL
  END,
  CASE
    WHEN LOWER(o.`name`) = 'zain iraq' THEN 'APPLICATIONNAME'
    WHEN LOWER(o.`name`) = 'zain sudan' THEN 'Service'
    WHEN LOWER(o.`name`) IN ('zain ksa', 'zain saudi arabia') THEN 'SERVICENAME'
    WHEN LOWER(o.`name`) = 'zain kuwait' THEN 'Service name'
    WHEN LOWER(o.`name`) IN ('zain bahrain', 'zain jordan') THEN 'Service Name'
    ELSE NULL
  END,
  CASE
    WHEN LOWER(o.`name`) = 'zain iraq' THEN 'SERVICE_REVENUE/IQD'
    WHEN LOWER(o.`name`) = 'zain sudan' THEN 'Revenue'
    WHEN LOWER(o.`name`) IN ('zain ksa', 'zain saudi arabia') THEN 'ORIGINALAMOUNT'
    WHEN LOWER(o.`name`) = 'zain kuwait' THEN 'Gross Revenue (LC)'
    WHEN LOWER(o.`name`) IN ('zain bahrain', 'zain jordan') THEN 'Total Gross Revenue'
    ELSE NULL
  END,
  CASE WHEN LOWER(o.`name`) = 'zain sudan' THEN true ELSE false END,
  CASE
    WHEN LOWER(o.`name`) IN ('zain bahrain', 'zain jordan') THEN '["Merchant Name","Service Name","Total Gross Revenue"]'
    WHEN LOWER(o.`name`) IN ('zain ksa', 'zain saudi arabia') THEN '["VENDORNAME","SERVICENAME","ORIGINALAMOUNT"]'
    WHEN LOWER(o.`name`) = 'zain kuwait' THEN '["Service provider Name","Service name","Gross Revenue (LC)"]'
    WHEN LOWER(o.`name`) = 'zain iraq' THEN '["APPLICATIONNAME","SERVICE_REVENUE/IQD"]'
    WHEN LOWER(o.`name`) = 'zain sudan' THEN '["Date","Service","Product","Revenue"]'
    ELSE NULL
  END,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3),
  false
FROM `opcos` o
WHERE o.`is_deleted` = false
  AND NOT EXISTS (
    SELECT 1 FROM `opco_report_mappings` m WHERE m.`opco_id` = o.`id` AND m.`is_deleted` = false
  );
