-- Seed audit lookups for Service–Partner maps (idempotent)

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'SERVICE_PARTNER_MAP_CREATED', 'Service partner map created', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ACTION'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ACTION' AND `l`.`code` = 'SERVICE_PARTNER_MAP_CREATED'
  );

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'SERVICE_PARTNER_MAP_UPDATED', 'Service partner map updated', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ACTION'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ACTION' AND `l`.`code` = 'SERVICE_PARTNER_MAP_UPDATED'
  );

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'SERVICE_PARTNER_MAP_DELETED', 'Service partner map deleted', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ACTION'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ACTION' AND `l`.`code` = 'SERVICE_PARTNER_MAP_DELETED'
  );

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'SERVICE_PARTNER_MAP_IMPORTED', 'Service partner map imported', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ACTION'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ACTION' AND `l`.`code` = 'SERVICE_PARTNER_MAP_IMPORTED'
  );

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'SERVICE_PARTNER_MAP', 'Service partner map', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ENTITY_TYPE'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ENTITY_TYPE' AND `l`.`code` = 'SERVICE_PARTNER_MAP'
  );
