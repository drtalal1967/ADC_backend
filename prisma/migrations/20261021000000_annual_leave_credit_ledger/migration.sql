-- Additive only: no balance updates, no historical ledger entries.
CREATE TABLE `annual_leave_credits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `month` CHAR(7) NOT NULL,
    `days` DECIMAL(4, 1) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `annual_leave_credit_employee_month` (`employee_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `annual_leave_credits`
    ADD CONSTRAINT `annual_leave_credits_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
