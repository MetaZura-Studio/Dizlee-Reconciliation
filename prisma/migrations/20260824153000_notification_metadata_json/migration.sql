-- Structured inbox metadata for CTAs and OpCo report-upload consolidation.
ALTER TABLE `notifications`
  ADD COLUMN `metadata_json` TEXT NULL;
