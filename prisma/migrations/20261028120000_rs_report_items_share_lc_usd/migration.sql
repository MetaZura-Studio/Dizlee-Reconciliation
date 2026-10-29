-- Persist LC-first revenue share amounts on RS report snapshot rows.
ALTER TABLE `revenue_share_report_items`
  ADD COLUMN `revenue_share_amount_lc` DECIMAL(18, 4) NULL,
  ADD COLUMN `revenue_share_amount_usd` DECIMAL(18, 4) NULL;
