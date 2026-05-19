DROP INDEX `public_holidays_date_key` ON `public_holidays`;
CREATE INDEX `public_holidays_date_end_date_idx` ON `public_holidays`(`date`, `end_date`);
