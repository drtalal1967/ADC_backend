/*
  Warnings:

  - You are about to drop the column `branch` on the `payments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `payments` DROP COLUMN `branch`;

-- AlterTable
ALTER TABLE `schedules` ADD COLUMN `branch` VARCHAR(100) NULL;
