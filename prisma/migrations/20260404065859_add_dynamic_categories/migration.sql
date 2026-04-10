/*
  Warnings:

  - You are about to alter the column `category` on the `documents` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `VarChar(100)`.

*/
-- AlterTable
ALTER TABLE `documents` MODIFY `category` VARCHAR(100) NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_module_key`(`name`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
