/*
  Warnings:

  - The values [IN_PROGRESS,READY,REJECTED] on the enum `lab_cases_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `lab_cases` MODIFY `status` ENUM('PENDING', 'PICKED_UP', 'IN_LAB', 'DELIVERED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
