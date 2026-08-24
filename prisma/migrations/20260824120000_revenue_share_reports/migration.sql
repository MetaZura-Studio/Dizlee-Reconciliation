-- CreateTable
CREATE TABLE `revenue_share_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `file_id` BIGINT NOT NULL,
    `generated_at` DATETIME(3) NOT NULL,
    `generated_by_user_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_revenue_share_reports`(`opco_id`, `year`, `month`),
    INDEX `idx_revenue_share_reports_period`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `revenue_share_reports` ADD CONSTRAINT `revenue_share_reports_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenue_share_reports` ADD CONSTRAINT `revenue_share_reports_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenue_share_reports` ADD CONSTRAINT `revenue_share_reports_generated_by_user_id_fkey` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
