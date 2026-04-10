-- AlterTable
ALTER TABLE `reminders` ADD COLUMN `target_user_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
