-- Partner RS: persist retention percents chosen at send + audit lookups

ALTER TABLE `partner_revenue_share_reports`
  ADD COLUMN `retention_percents_json` TEXT NULL;

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'PARTNER_RS_REPORT_SENT', 'Partner RS report sent', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ACTION'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ACTION' AND `l`.`code` = 'PARTNER_RS_REPORT_SENT'
  );

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'PARTNER_REVENUE_SHARE_REPORT', 'Partner revenue share report', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ENTITY_TYPE'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ENTITY_TYPE' AND `l`.`code` = 'PARTNER_REVENUE_SHARE_REPORT'
  );
