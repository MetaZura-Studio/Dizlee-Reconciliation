-- Optional supporting files on Dizlee → OpCo invoices (any format; size capped in app).

CREATE TABLE `invoice_attachments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL,
    `file_id` BIGINT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `idx_invoice_attachments_invoice_sort` ON `invoice_attachments`(`invoice_id`, `sort_order`);

ALTER TABLE `invoice_attachments` ADD CONSTRAINT `invoice_attachments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoice_attachments` ADD CONSTRAINT `invoice_attachments_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
