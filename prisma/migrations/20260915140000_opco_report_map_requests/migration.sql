-- OpCo requests Admin to configure report column mapping.

CREATE TABLE `opco_report_map_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `requested_by_user_id` BIGINT NOT NULL,
    `message` TEXT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `fulfilled_at` DATETIME(3) NULL,
    `fulfilled_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_opco_report_map_requests_status_created`(`status`, `created_at`),
    INDEX `idx_opco_report_map_requests_opco_id`(`opco_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `opco_report_map_requests` ADD CONSTRAINT `opco_report_map_requests_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `opco_report_map_requests` ADD CONSTRAINT `opco_report_map_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `opco_report_map_requests` ADD CONSTRAINT `opco_report_map_requests_fulfilled_by_user_id_fkey` FOREIGN KEY (`fulfilled_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
