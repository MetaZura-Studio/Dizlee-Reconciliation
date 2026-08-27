-- CreateTable
CREATE TABLE `revenue_share_report_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `revenue_share_report_id` INTEGER NOT NULL,
    `partner_id` BIGINT NULL,
    `partner_name` VARCHAR(255) NOT NULL,
    `service_name` VARCHAR(255) NOT NULL,
    `opco_amount_usd` DECIMAL(18, 4) NULL,
    `partner_amount_usd` DECIMAL(18, 4) NULL,
    `regulatory_fee_percent` DECIMAL(5, 2) NOT NULL,
    `regulatory_fee_amount` DECIMAL(18, 4) NOT NULL,
    `net_revenue` DECIMAL(18, 4) NOT NULL,
    `revenue_share_percent` DECIMAL(18, 4) NULL,
    `sort_order` INTEGER NOT NULL,

    INDEX `idx_rs_report_items_report_id`(`revenue_share_report_id`),
    INDEX `idx_rs_report_items_report_sort`(`revenue_share_report_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `revenue_share_report_items` ADD CONSTRAINT `revenue_share_report_items_revenue_share_report_id_fkey` FOREIGN KEY (`revenue_share_report_id`) REFERENCES `revenue_share_reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `revenue_share_report_items` ADD CONSTRAINT `revenue_share_report_items_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
