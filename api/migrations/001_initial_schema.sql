CREATE TABLE users (
  id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('normal_user', 'admin') NOT NULL DEFAULT 'normal_user',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  user_id CHAR(36) NOT NULL,
  app_name VARCHAR(150) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activities (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  activity_type ENUM('hiking', 'fitness') NOT NULL,
  name VARCHAR(200) NOT NULL,
  activity_date DATE NOT NULL,
  minutes INT UNSIGNED NOT NULL,
  metres INT UNSIGNED NOT NULL DEFAULT 0,
  created_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_activities_user_date (user_id, activity_date, created_at),
  CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_activities_minutes CHECK (minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_people (
  activity_id CHAR(36) NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  person_name VARCHAR(150) NOT NULL,
  PRIMARY KEY (activity_id, position),
  CONSTRAINT fk_activity_people_activity FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE weights (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  weight_kg DECIMAL(6,2) UNSIGNED NOT NULL,
  recorded_on DATE NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_weights_user_recorded (user_id, recorded_on, created_at),
  CONSTRAINT fk_weights_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_weights_positive CHECK (weight_kg > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE friend_connections (
  id CHAR(36) NOT NULL,
  user_id_1 CHAR(36) NOT NULL,
  user_id_2 CHAR(36) NOT NULL,
  requester_id CHAR(36) NOT NULL,
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_friend_pair (user_id_1, user_id_2),
  KEY idx_friend_user_2 (user_id_2, status),
  CONSTRAINT fk_friend_user_1 FOREIGN KEY (user_id_1) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_friend_user_2 FOREIGN KEY (user_id_2) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_friend_requester FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_friend_distinct_users CHECK (user_id_1 <> user_id_2),
  CONSTRAINT chk_friend_requester CHECK (requester_id IN (user_id_1, user_id_2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_reactions (
  activity_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reaction_type ENUM('like', 'slap') NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (activity_id, user_id, reaction_type),
  KEY idx_reactions_activity_created (activity_id, reaction_type, created_at),
  CONSTRAINT fk_reactions_activity FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE,
  CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
