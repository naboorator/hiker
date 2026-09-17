CREATE TABLE `activity_locations` (
  `activity_id` char(36) NOT NULL,
  `sequence` int unsigned NOT NULL,
  `segment` int unsigned NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `accuracy` decimal(8,2) unsigned NOT NULL,
  `recorded_at` datetime(3) NOT NULL,
  PRIMARY KEY (`activity_id`, `sequence`),
  KEY `idx_activity_locations_recorded` (`activity_id`, `recorded_at`),
  CONSTRAINT `fk_activity_locations_activity`
    FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
