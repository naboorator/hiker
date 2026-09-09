ALTER TABLE users
  ADD COLUMN status ENUM('active', 'blocked', 'deleted') NOT NULL DEFAULT 'active' AFTER role,
  ADD KEY idx_users_status_created (status, created_at);
