-- My Hike production schema-only import
-- Target: MariaDB 10.11.19 or newer, including servers whose default charset is latin1.
-- Contains all required tables and no users, activities, or other table records.
-- Import this file only after selecting the intended empty target database.
-- WARNING: existing My Hike tables are dropped before the empty structure is created.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `activity_reactions`;
DROP TABLE IF EXISTS `activity_people`;
DROP TABLE IF EXISTS `activities`;
DROP TABLE IF EXISTS `friend_connections`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `weights`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(320) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('normal_user', 'admin') NOT NULL DEFAULT 'normal_user',
  `status` enum('active', 'blocked', 'deleted') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_status_created` (`status`, `created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `settings` (
  `user_id` char(36) NOT NULL,
  `app_name` varchar(150) NOT NULL,
  `owner_name` varchar(150) NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activities` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `activity_type` enum('hiking', 'fitness') NOT NULL,
  `name` varchar(200) NOT NULL,
  `activity_date` date NOT NULL,
  `minutes` int unsigned NOT NULL,
  `metres` int unsigned NOT NULL DEFAULT 0,
  `created_at` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activities_user_date` (`user_id`, `activity_date`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activity_people` (
  `activity_id` char(36) NOT NULL,
  `position` smallint unsigned NOT NULL,
  `person_name` varchar(150) NOT NULL,
  PRIMARY KEY (`activity_id`, `position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `weights` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `weight_kg` decimal(6,2) unsigned NOT NULL,
  `recorded_on` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_weights_user_recorded` (`user_id`, `recorded_on`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `friend_connections` (
  `id` char(36) NOT NULL,
  `user_id_1` char(36) NOT NULL,
  `user_id_2` char(36) NOT NULL,
  `requester_id` char(36) NOT NULL,
  `status` enum('pending', 'accepted') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_friend_pair` (`user_id_1`, `user_id_2`),
  KEY `idx_friend_user_2` (`user_id_2`, `status`),
  KEY `fk_friend_requester` (`requester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activity_reactions` (
  `activity_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `reaction_type` enum('like', 'slap') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`, `user_id`, `reaction_type`),
  KEY `idx_reactions_activity_created` (`activity_id`, `reaction_type`, `created_at`),
  KEY `fk_reactions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `settings`
  ADD CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `activities`
  ADD CONSTRAINT `fk_activities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `activity_people`
  ADD CONSTRAINT `fk_activity_people_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE;

ALTER TABLE `weights`
  ADD CONSTRAINT `fk_weights_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `friend_connections`
  ADD CONSTRAINT `fk_friend_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_friend_user_1` FOREIGN KEY (`user_id_1`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_friend_user_2` FOREIGN KEY (`user_id_2`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `activity_reactions`
  ADD CONSTRAINT `fk_reactions_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
