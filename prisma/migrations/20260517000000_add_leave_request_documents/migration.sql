ALTER TABLE `documents` ADD COLUMN `leave_request_id` INTEGER NULL;
ALTER TABLE `documents` ADD CONSTRAINT `documents_leave_request_id_fkey` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
