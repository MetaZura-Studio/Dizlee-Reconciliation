-- Global Service/Application name → Partner mapping (Iraq/Sudan OpCo report resolve)

CREATE TABLE `service_partner_maps` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `service_name` VARCHAR(255) NOT NULL,
    `service_key` VARCHAR(255) NOT NULL,
    `partner_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_service_partner_maps_service_key`(`service_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `service_partner_maps` ADD CONSTRAINT `service_partner_maps_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `service_partner_maps` ADD CONSTRAINT `service_partner_maps_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `service_partner_maps` ADD CONSTRAINT `service_partner_maps_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
