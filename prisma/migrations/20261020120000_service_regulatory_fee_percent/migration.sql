-- Per-service regulatory fee on service_partner_maps; drop OpCo-wide VAT.

ALTER TABLE `service_partner_maps`
  ADD COLUMN `regulatory_fee_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0;

UPDATE `service_partner_maps` AS `spm`
INNER JOIN `opcos` AS `o` ON `o`.`id` = `spm`.`opco_id`
SET `spm`.`regulatory_fee_percent` = `o`.`vat_percent`;

ALTER TABLE `opcos` DROP COLUMN `vat_percent`;
