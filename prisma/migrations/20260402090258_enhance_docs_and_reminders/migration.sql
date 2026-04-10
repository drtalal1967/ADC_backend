-- AlterTable
ALTER TABLE `documents` ADD COLUMN `branch` VARCHAR(100) NULL,
    ADD COLUMN `employee_id` INTEGER NULL,
    ADD COLUMN `laboratory_id` INTEGER NULL,
    MODIFY `category` ENUM('CONTRACT', 'INVOICE', 'RECEIPT', 'REPORT', 'IMAGE', 'EXPENSE', 'DAILY_INCOME_SHEET', 'LICENSE', 'WORK_PERMIT', 'VISA', 'AGREEMENT', 'ID', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE `employees` ADD COLUMN `end_date` DATE NULL;

-- AlterTable
ALTER TABLE `reminders` ADD COLUMN `attachment_url` VARCHAR(600) NULL;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_laboratory_id_fkey` FOREIGN KEY (`laboratory_id`) REFERENCES `laboratories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
