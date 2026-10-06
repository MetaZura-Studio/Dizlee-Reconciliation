-- Multiple Admin report-mapping row filters (AND equals), stored as JSON.
-- Legacy row_filter_column / row_filter_value kept in sync with the first filter.

ALTER TABLE `opco_report_mappings` ADD COLUMN `row_filters_json` TEXT NULL;

UPDATE `opco_report_mappings`
SET `row_filters_json` = CONCAT(
  '[{"column":',
  JSON_QUOTE(`row_filter_column`),
  ',"value":',
  JSON_QUOTE(`row_filter_value`),
  '}]'
)
WHERE `row_filter_column` IS NOT NULL
  AND `row_filter_value` IS NOT NULL
  AND TRIM(`row_filter_column`) <> ''
  AND TRIM(`row_filter_value`) <> '';
