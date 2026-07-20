-- Bank + signatories snapshot for digital Dizlee→OpCo invoices.
-- Column may already exist on local DBs that used db push; IF NOT EXISTS is not
-- portable across MySQL/TiDB, so use a guarded approach via procedure-free check
-- is unavailable. Prisma migrate tracks history — on fresh TiDB this ADD runs once.

ALTER TABLE `invoices` ADD COLUMN `bank_details_json` TEXT NULL;
