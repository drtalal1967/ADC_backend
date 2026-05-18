ALTER TABLE `payments` ADD COLUMN `batch_group_id` VARCHAR(100) NULL;
CREATE INDEX `payments_batch_group_id_idx` ON `payments`(`batch_group_id`);