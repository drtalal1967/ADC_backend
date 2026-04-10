-- AlterTable
ALTER TABLE `reminders` ADD COLUMN `branch` VARCHAR(100) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `method` VARCHAR(50) NULL DEFAULT 'In-App',
    ADD COLUMN `notify_at` DATETIME(3) NULL,
    ADD COLUMN `severity` VARCHAR(20) NULL DEFAULT 'info';
