ALTER TABLE `users`
  ADD COLUMN `email_confirmed` tinyint(1) NOT NULL DEFAULT 1 AFTER `language`,
  ADD COLUMN `email_confirmed_at` datetime NULL AFTER `email_confirmed`;

UPDATE `users`
   SET `email_confirmed` = 1,
       `email_confirmed_at` = COALESCE(`email_confirmed_at`, NOW());

ALTER TABLE `users`
  ALTER COLUMN `email_confirmed` SET DEFAULT 0;

CREATE TABLE `email_confirmation_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_confirmation_token_hash` (`token_hash`),
  KEY `idx_email_confirmation_user_expiry` (`user_id`, `expires_at`),
  CONSTRAINT `fk_email_confirmation_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
