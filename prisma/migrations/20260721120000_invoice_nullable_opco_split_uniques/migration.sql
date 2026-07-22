-- Partner → Dizlee invoices are period-scoped with no OpCo (SRS UC-06-PARTNER).
-- Split uniqueness: partner+period+type vs opco+period+type.
-- MySQL uses uq_invoices_business_key as the supporting index for invoices_opco_id_fkey,
-- so add a dedicated opco_id index before dropping that unique.

CREATE INDEX `invoices_opco_id_idx` ON `invoices`(`opco_id`);

ALTER TABLE `invoices` DROP INDEX `uq_invoices_business_key`;

ALTER TABLE `invoices` MODIFY `opco_id` BIGINT NULL;

-- Clear OpCo on Partner → Dizlee invoices (SRS: not stored).
UPDATE `invoices` i
INNER JOIN `lookups` lt ON lt.`id` = i.`invoice_type_id`
SET i.`opco_id` = NULL
WHERE lt.`code` = 'PARTNER_TO_CLIENT';

-- Keep a single Partner → Dizlee invoice per partner+period+type if historical duplicates exist.
DELETE ii FROM `invoice_items` ii
INNER JOIN `invoices` i ON i.`id` = ii.`invoice_id`
INNER JOIN `lookups` lt ON lt.`id` = i.`invoice_type_id`
INNER JOIN `invoices` keep ON
  keep.`partner_id` = i.`partner_id`
  AND keep.`month` = i.`month`
  AND keep.`year` = i.`year`
  AND keep.`invoice_type_id` = i.`invoice_type_id`
  AND keep.`id` < i.`id`
WHERE lt.`code` = 'PARTNER_TO_CLIENT'
  AND i.`partner_id` IS NOT NULL;

DELETE ial FROM `invoice_activity_logs` ial
INNER JOIN `invoices` i ON i.`id` = ial.`invoice_id`
INNER JOIN `lookups` lt ON lt.`id` = i.`invoice_type_id`
INNER JOIN `invoices` keep ON
  keep.`partner_id` = i.`partner_id`
  AND keep.`month` = i.`month`
  AND keep.`year` = i.`year`
  AND keep.`invoice_type_id` = i.`invoice_type_id`
  AND keep.`id` < i.`id`
WHERE lt.`code` = 'PARTNER_TO_CLIENT'
  AND i.`partner_id` IS NOT NULL;

DELETE i FROM `invoices` i
INNER JOIN `lookups` lt ON lt.`id` = i.`invoice_type_id`
INNER JOIN `invoices` keep ON
  keep.`partner_id` = i.`partner_id`
  AND keep.`month` = i.`month`
  AND keep.`year` = i.`year`
  AND keep.`invoice_type_id` = i.`invoice_type_id`
  AND keep.`id` < i.`id`
WHERE lt.`code` = 'PARTNER_TO_CLIENT'
  AND i.`partner_id` IS NOT NULL;

ALTER TABLE `invoices`
  ADD CONSTRAINT `uq_partner_period_invoices` UNIQUE (`partner_id`, `month`, `year`, `invoice_type_id`);

ALTER TABLE `invoices`
  ADD CONSTRAINT `uq_client_period_invoices` UNIQUE (`opco_id`, `month`, `year`, `invoice_type_id`);
