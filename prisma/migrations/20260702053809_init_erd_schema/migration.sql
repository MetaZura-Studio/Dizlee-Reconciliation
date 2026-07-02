-- CreateTable
CREATE TABLE `lookup_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(500) NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `lookup_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lookups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lookup_type_id` INTEGER NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_lookups_type_code`(`lookup_type_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currencies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `iso_code` VARCHAR(8) NOT NULL,
    `symbol` VARCHAR(16) NULL,
    `decimal_precision` INTEGER NOT NULL DEFAULT 2,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `currencies_iso_code_key`(`iso_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opcos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `default_currency_id` BIGINT NOT NULL,
    `status_id` INTEGER NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partners` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `status_id` INTEGER NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `name` VARCHAR(255) NULL,
    `role_id` INTEGER NOT NULL,
    `status_id` INTEGER NOT NULL,
    `opco_id` BIGINT NULL,
    `partner_id` BIGINT NULL,
    `last_login_at` DATETIME(3) NULL,
    `password_reset_token` VARCHAR(255) NULL,
    `password_reset_expires_at` DATETIME(3) NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currency_monthly_rates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `currency_id` BIGINT NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `rate_to_usd` DECIMAL(18, 8) NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_currency_monthly_rates`(`currency_id`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opco_partner_links` (
    `opco_id` BIGINT NOT NULL,
    `partner_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`opco_id`, `partner_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `filename` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(512) NOT NULL,
    `mime_type` VARCHAR(128) NULL,
    `size_bytes` BIGINT NULL,
    `checksum` VARCHAR(128) NULL,
    `uploaded_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `email_enabled` BOOLEAN NOT NULL DEFAULT false,
    `smtp_host` VARCHAR(255) NULL,
    `smtp_port` INTEGER NULL,
    `sender_address` VARCHAR(255) NULL,
    `reminders_enabled` BOOLEAN NOT NULL DEFAULT false,
    `reminder_value` INTEGER NULL,
    `reminder_unit` VARCHAR(16) NULL,
    `reconciliation_negligible_percent` DECIMAL(5, 2) NULL,
    `opco_invoice_bank_details_json` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actor_user_id` BIGINT NOT NULL,
    `action_id` INTEGER NOT NULL,
    `entity_type_id` INTEGER NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `message` TEXT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `status_id` INTEGER NOT NULL,
    `priority` VARCHAR(32) NULL,
    `expires_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_recipients` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `notification_id` BIGINT NOT NULL,
    `recipient_type_id` INTEGER NOT NULL,
    `recipient_id` BIGINT NOT NULL,
    `from_user_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_reads` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `notification_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_notification_reads`(`notification_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_attachments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `notification_id` BIGINT NOT NULL,
    `file_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `status_id` INTEGER NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `notification_templates_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_template_versions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `notification_template_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `change_note` VARCHAR(500) NULL,
    `created_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_etv_template_version`(`notification_template_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `opco_id` BIGINT NOT NULL,
    `partner_id` BIGINT NOT NULL,
    `file_id` BIGINT NULL,
    `currency_id` BIGINT NOT NULL,
    `status_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_by_user_id` BIGINT NULL,
    `uploaded_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_reports`(`opco_id`, `partner_id`, `year`, `month`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_line_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `report_id` BIGINT NOT NULL,
    `line_number` INTEGER NOT NULL,
    `description` VARCHAR(255) NULL,
    `usage_amount` DECIMAL(18, 4) NULL,
    `usage_usd` DECIMAL(18, 4) NULL,
    `amount` DECIMAL(18, 4) NULL,
    `exchange_rate` DECIMAL(18, 4) NULL,
    `usage_unit` VARCHAR(32) NULL,
    `source_columns` JSON NULL,
    `reconciliation_basis` VARCHAR(64) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_change_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `report_id` BIGINT NOT NULL,
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

-- CreateTable
CREATE TABLE `consolidations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `status_id` INTEGER NOT NULL,
    `total_amount_usd` DECIMAL(18, 4) NULL,
    `generated_at` DATETIME(3) NOT NULL,
    `run_by_user_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_consolidations`(`opco_id`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consolidation_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `consolidation_id` INTEGER NOT NULL,
    `partner_id` BIGINT NULL,
    `partner_name` VARCHAR(255) NOT NULL,
    `service_code` VARCHAR(128) NULL,
    `description` VARCHAR(255) NOT NULL,
    `usage_amount` DECIMAL(18, 4) NOT NULL,
    `usage_usd` DECIMAL(18, 4) NULL,
    `exchange_rate` DECIMAL(18, 4) NULL,
    `usage_unit` VARCHAR(32) NULL,
    `revenue_basis` VARCHAR(64) NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_consolidation_items`(`consolidation_id`, `partner_name`, `service_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reconciliations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `opco_id` BIGINT NOT NULL,
    `partner_id` BIGINT NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `opco_report_id` BIGINT NOT NULL,
    `partner_report_id` BIGINT NOT NULL,
    `status_id` INTEGER NOT NULL,
    `total_variance` DECIMAL(18, 4) NULL,
    `matched_count` INTEGER NULL,
    `unmatched_count` INTEGER NULL,
    `run_by_user_id` BIGINT NOT NULL,
    `run_at` DATETIME(3) NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_reconciliations`(`opco_id`, `partner_id`, `year`, `month`, `opco_report_id`, `partner_report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reconciliation_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `reconciliation_id` INTEGER NOT NULL,
    `service_code` VARCHAR(128) NOT NULL,
    `description` VARCHAR(255) NULL,
    `opco_line_item_id` BIGINT NULL,
    `partner_line_item_id` BIGINT NULL,
    `opco_amount` DECIMAL(18, 4) NULL,
    `partner_amount` DECIMAL(18, 4) NULL,
    `variance_amount` DECIMAL(18, 4) NULL,
    `confirmed_value` DECIMAL(18, 4) NULL,
    `match_status_id` INTEGER NOT NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_reconciliation_items`(`reconciliation_id`, `service_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(64) NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `opco_id` BIGINT NOT NULL,
    `partner_id` BIGINT NULL,
    `invoice_type_id` INTEGER NOT NULL,
    `file_id` BIGINT NULL,
    `currency_id` BIGINT NOT NULL,
    `uploaded_by_user_id` BIGINT NULL,
    `invoice_status_id` INTEGER NOT NULL,
    `payment_status_id` INTEGER NULL,
    `sent_at` DATETIME(3) NULL,
    `acknowledged_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `settled_at` DATETIME(3) NULL,
    `created_by_user_id` BIGINT NULL,
    `updated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by_user_id` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    UNIQUE INDEX `uq_invoices_business_key`(`opco_id`, `partner_id`, `month`, `year`, `invoice_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(18, 4) NOT NULL,
    `unit_price` DECIMAL(18, 4) NOT NULL,
    `discount` DECIMAL(18, 4) NULL DEFAULT 0,
    `tax` DECIMAL(18, 4) NULL DEFAULT 0,
    `line_total` DECIMAL(18, 4) NOT NULL,
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

-- CreateTable
CREATE TABLE `invoice_activity_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL,
    `actor_user_id` BIGINT NOT NULL,
    `action_id` INTEGER NOT NULL,
    `status_field` VARCHAR(32) NULL,
    `previous_status` VARCHAR(64) NULL,
    `new_status` VARCHAR(64) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lookup_types` ADD CONSTRAINT `lookup_types_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_types` ADD CONSTRAINT `lookup_types_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookups` ADD CONSTRAINT `lookups_lookup_type_id_fkey` FOREIGN KEY (`lookup_type_id`) REFERENCES `lookup_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookups` ADD CONSTRAINT `lookups_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookups` ADD CONSTRAINT `lookups_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `currencies` ADD CONSTRAINT `currencies_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `currencies` ADD CONSTRAINT `currencies_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opcos` ADD CONSTRAINT `opcos_default_currency_id_fkey` FOREIGN KEY (`default_currency_id`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opcos` ADD CONSTRAINT `opcos_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opcos` ADD CONSTRAINT `opcos_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opcos` ADD CONSTRAINT `opcos_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partners` ADD CONSTRAINT `partners_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partners` ADD CONSTRAINT `partners_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partners` ADD CONSTRAINT `partners_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `currency_monthly_rates` ADD CONSTRAINT `currency_monthly_rates_currency_id_fkey` FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opco_partner_links` ADD CONSTRAINT `opco_partner_links_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opco_partner_links` ADD CONSTRAINT `opco_partner_links_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_action_id_fkey` FOREIGN KEY (`action_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_entity_type_id_fkey` FOREIGN KEY (`entity_type_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_recipients` ADD CONSTRAINT `notification_recipients_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_recipients` ADD CONSTRAINT `notification_recipients_recipient_type_id_fkey` FOREIGN KEY (`recipient_type_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_recipients` ADD CONSTRAINT `notification_recipients_from_user_id_fkey` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_reads_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_reads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_attachments` ADD CONSTRAINT `notification_attachments_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_attachments` ADD CONSTRAINT `notification_attachments_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_templates` ADD CONSTRAINT `notification_templates_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_template_versions` ADD CONSTRAINT `email_template_versions_notification_template_id_fkey` FOREIGN KEY (`notification_template_id`) REFERENCES `notification_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_currency_id_fkey` FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_line_items` ADD CONSTRAINT `report_line_items_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_change_requests` ADD CONSTRAINT `report_change_requests_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_change_requests` ADD CONSTRAINT `report_change_requests_requested_by_user_id_fkey` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_change_requests` ADD CONSTRAINT `report_change_requests_decided_by_user_id_fkey` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_change_requests` ADD CONSTRAINT `report_change_requests_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consolidations` ADD CONSTRAINT `consolidations_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consolidations` ADD CONSTRAINT `consolidations_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consolidations` ADD CONSTRAINT `consolidations_run_by_user_id_fkey` FOREIGN KEY (`run_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consolidation_items` ADD CONSTRAINT `consolidation_items_consolidation_id_fkey` FOREIGN KEY (`consolidation_id`) REFERENCES `consolidations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consolidation_items` ADD CONSTRAINT `consolidation_items_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_opco_report_id_fkey` FOREIGN KEY (`opco_report_id`) REFERENCES `reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_partner_report_id_fkey` FOREIGN KEY (`partner_report_id`) REFERENCES `reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_run_by_user_id_fkey` FOREIGN KEY (`run_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliation_items` ADD CONSTRAINT `reconciliation_items_reconciliation_id_fkey` FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliation_items` ADD CONSTRAINT `reconciliation_items_opco_line_item_id_fkey` FOREIGN KEY (`opco_line_item_id`) REFERENCES `report_line_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliation_items` ADD CONSTRAINT `reconciliation_items_partner_line_item_id_fkey` FOREIGN KEY (`partner_line_item_id`) REFERENCES `report_line_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliation_items` ADD CONSTRAINT `reconciliation_items_match_status_id_fkey` FOREIGN KEY (`match_status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_invoice_type_id_fkey` FOREIGN KEY (`invoice_type_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_currency_id_fkey` FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_invoice_status_id_fkey` FOREIGN KEY (`invoice_status_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_payment_status_id_fkey` FOREIGN KEY (`payment_status_id`) REFERENCES `lookups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_activity_logs` ADD CONSTRAINT `invoice_activity_logs_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_activity_logs` ADD CONSTRAINT `invoice_activity_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_activity_logs` ADD CONSTRAINT `invoice_activity_logs_action_id_fkey` FOREIGN KEY (`action_id`) REFERENCES `lookups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
