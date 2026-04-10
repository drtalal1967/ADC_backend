-- AlterTable
ALTER TABLE `employees` ADD COLUMN `job_title` VARCHAR(100) NULL,
    ADD COLUMN `license_expiry` DATE NULL,
    ADD COLUMN `visa_expiry` DATE NULL,
    ADD COLUMN `work_permit_expiry` DATE NULL;

-- AlterTable
ALTER TABLE `lab_cases` ADD COLUMN `patient_number` VARCHAR(50) NULL,
    ADD COLUMN `prosthesis_type` VARCHAR(100) NULL;

-- CreateTable
CREATE TABLE `case_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lab_case_id` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `case_logs` ADD CONSTRAINT `case_logs_lab_case_id_fkey` FOREIGN KEY (`lab_case_id`) REFERENCES `lab_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
