-- OpCo monthly raw-file submissions (one Excel per OpCo+period) + submission change requests.

CREATE TABLE `opco_report_submissions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `file_id` BIGINT NOT NULL,
    `status_id` INTEGER NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_opco_report_submissions`(`opco_id`, `year`, `month`),
    INDEX `idx_opco_report_submissions_period`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `opco_submission_change_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `submission_id` BIGINT NOT NULL,
    `requested_by_user_id` BIGINT NOT NULL,
    `status_id` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `decision_note` TEXT NULL,
    `decided_by_user_id` BIGINT NULL,
    `decided_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reports` ADD COLUMN `submission_id` BIGINT NULL;

CREATE INDEX `idx_reports_submission_id` ON `reports`(`submission_id`);

ALTER TABLE `opco_report_submissions` ADD CONSTRAINT `opco_report_submissions_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `opco_report_submissions` ADD CONSTRAINT `opco_report_submissions_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `opco_report_submissions` ADD CONSTRAINT `opco_report_submissions_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `opco_submission_change_requests` ADD CONSTRAINT `opco_submission_change_requests_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `opco_report_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `opco_submission_change_requests` ADD CONSTRAINT `opco_submission_change_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `opco_submission_change_requests` ADD CONSTRAINT `opco_submission_change_requests_decided_by_user_id_fkey` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `opco_submission_change_requests` ADD CONSTRAINT `opco_submission_change_requests_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reports` ADD CONSTRAINT `reports_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `opco_report_submissions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one submission per OpCo-lane period from an existing report file.
INSERT INTO `opco_report_submissions` (
  `opco_id`,
  `year`,
  `month`,
  `file_id`,
  `status_id`,
  `created_at`,
  `updated_at`,
  `is_deleted`
)
SELECT
  r.`opco_id`,
  r.`year`,
  r.`month`,
  MIN(r.`file_id`),
  COALESCE(
    (
      SELECT l.`id`
      FROM `lookups` l
      INNER JOIN `lookup_types` lt ON lt.`id` = l.`lookup_type_id`
      WHERE lt.`code` = 'REPORT_STATUS' AND l.`code` = 'SUBMITTED'
      LIMIT 1
    ),
    MIN(r.`status_id`)
  ),
  UTC_TIMESTAMP(3),
  UTC_TIMESTAMP(3),
  false
FROM `reports` r
WHERE r.`version` = 1
  AND r.`is_deleted` = false
  AND r.`file_id` IS NOT NULL
GROUP BY r.`opco_id`, r.`year`, r.`month`;

UPDATE `reports` r
INNER JOIN `opco_report_submissions` s
  ON s.`opco_id` = r.`opco_id`
 AND s.`year` = r.`year`
 AND s.`month` = r.`month`
SET r.`submission_id` = s.`id`
WHERE r.`version` = 1
  AND r.`is_deleted` = false
  AND r.`submission_id` IS NULL;
