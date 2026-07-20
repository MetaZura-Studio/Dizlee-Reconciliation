-- Remap notification template categories from domain (REPORTS/INVOICES)
-- to communication type (INTIMATION/REMINDER/OTHER).

UPDATE `notification_templates`
SET `category` = 'REMINDER'
WHERE `code` LIKE '%REMINDER%';

UPDATE `notification_templates`
SET `category` = 'INTIMATION'
WHERE `code` LIKE '%SUBMISSION%'
   OR `code` LIKE '%INTIMATION%';

UPDATE `notification_templates`
SET `category` = 'OTHER'
WHERE `code` LIKE 'PASSWORD_%';

-- Any remaining legacy domain categories
UPDATE `notification_templates`
SET `category` = 'INTIMATION'
WHERE `category` IN ('REPORTS', 'INVOICES');
