-- Seed audit lookup for Partners Excel import (idempotent)

INSERT INTO `lookups` (`lookup_type_id`, `code`, `label`, `sort_order`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
SELECT `id`, 'PARTNER_IMPORTED', 'Partner imported', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), false
FROM `lookup_types`
WHERE `code` = 'AUDIT_ACTION'
  AND NOT EXISTS (
    SELECT 1 FROM `lookups` `l`
    INNER JOIN `lookup_types` `lt` ON `lt`.`id` = `l`.`lookup_type_id`
    WHERE `lt`.`code` = 'AUDIT_ACTION' AND `l`.`code` = 'PARTNER_IMPORTED'
  );
