-- Service–Partner maps are per OpCo (listing is OpCo + Partner + Service).

DELETE FROM `service_partner_maps`;

ALTER TABLE `service_partner_maps` DROP INDEX `uq_service_partner_maps_service_key`;

ALTER TABLE `service_partner_maps` ADD COLUMN `opco_id` BIGINT NOT NULL;

ALTER TABLE `service_partner_maps` ADD CONSTRAINT `service_partner_maps_opco_id_fkey` FOREIGN KEY (`opco_id`) REFERENCES `opcos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX `uq_service_partner_maps_opco_service_key` ON `service_partner_maps`(`opco_id`, `service_key`);

CREATE INDEX `idx_service_partner_maps_opco_id` ON `service_partner_maps`(`opco_id`);
