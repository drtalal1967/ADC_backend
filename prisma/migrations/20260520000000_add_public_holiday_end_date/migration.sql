ALTER TABLE `public_holidays` ADD COLUMN `end_date` DATE NULL;
UPDATE `public_holidays` SET `end_date` = `date` WHERE `end_date` IS NULL;
ALTER TABLE `public_holidays` MODIFY `end_date` DATE NOT NULL;