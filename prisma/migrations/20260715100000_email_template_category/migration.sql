-- AlterTable
ALTER TABLE `notification_templates` ADD COLUMN `category` VARCHAR(32) NOT NULL DEFAULT 'OTHER';

-- Backfill from code prefixes
UPDATE `notification_templates`
SET `category` = 'REPORTS'
WHERE `code` LIKE 'REPORT_%';

UPDATE `notification_templates`
SET `category` = 'INVOICES'
WHERE `code` LIKE 'INVOICE_%';

UPDATE `notification_templates`
SET `category` = 'OTHER'
WHERE `code` NOT LIKE 'REPORT_%' AND `code` NOT LIKE 'INVOICE_%';

-- CreateIndex
CREATE INDEX `idx_notification_templates_category` ON `notification_templates`(`category`);
