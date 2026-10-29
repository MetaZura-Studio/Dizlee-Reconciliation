-- Soft-delete currencies that are not OpCo settlement currencies (keep USD + OpCo ISOs).
UPDATE `currencies`
SET
  `is_deleted` = 1,
  `deleted_at` = CURRENT_TIMESTAMP(3)
WHERE `iso_code` IN ('EUR', 'GBP', 'AED', 'OMR')
  AND `is_deleted` = 0;
