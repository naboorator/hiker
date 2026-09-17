ALTER TABLE `activity_locations`
  ADD COLUMN `altitude` decimal(9,2) NULL AFTER `accuracy`,
  ADD COLUMN `altitude_accuracy` decimal(8,2) unsigned NULL AFTER `altitude`;
