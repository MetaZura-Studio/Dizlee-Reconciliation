-- Persist Dizlee create-time “local + USD” invoice copy for OpCo/Dizlee detail & print.
ALTER TABLE `invoices`
  ADD COLUMN `include_usd_copy` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `usd_fx_rate` DECIMAL(18, 8) NULL;
