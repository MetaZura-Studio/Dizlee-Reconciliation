-- Shared auth rate limits across serverless instances
CREATE TABLE `auth_rate_limit_buckets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `bucket_key` VARCHAR(255) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `reset_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `auth_rate_limit_buckets_bucket_key_key`(`bucket_key`),
    INDEX `idx_auth_rate_limit_reset_at`(`reset_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cron reminder idempotency ledger
CREATE TABLE `cron_job_runs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `job_key` VARCHAR(64) NOT NULL,
    `run_date` VARCHAR(10) NOT NULL,
    `step_key` VARCHAR(255) NOT NULL,
    `period_year` INTEGER NOT NULL,
    `period_month` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uq_cron_job_runs`(`job_key`, `run_date`, `step_key`),
    INDEX `idx_cron_job_runs_job_date`(`job_key`, `run_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
