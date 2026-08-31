-- CreateTable
CREATE TABLE `opco_partner_link_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `requested_by_user_id` BIGINT NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `partner_names_json` TEXT NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `decision_note` TEXT NULL,
    `decided_by_user_id` BIGINT NULL,
    `decided_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_opco_partner_link_requests_status_created`(`status`, `created_at`),
    INDEX `idx_opco_partner_link_requests_opco_id`(`opco_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `opco_partner_link_requests` ADD CONSTRAINT `opco_partner_link_requests_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opco_partner_link_requests` ADD CONSTRAINT `opco_partner_link_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opco_partner_link_requests` ADD CONSTRAINT `opco_partner_link_requests_decided_by_user_id_fkey` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
