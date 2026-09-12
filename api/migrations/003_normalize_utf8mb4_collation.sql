SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE settings DROP FOREIGN KEY fk_settings_user;
ALTER TABLE activities DROP FOREIGN KEY fk_activities_user;
ALTER TABLE activity_people DROP FOREIGN KEY fk_activity_people_activity;
ALTER TABLE weights DROP FOREIGN KEY fk_weights_user;
ALTER TABLE friend_connections
  DROP FOREIGN KEY fk_friend_user_1,
  DROP FOREIGN KEY fk_friend_user_2,
  DROP FOREIGN KEY fk_friend_requester;
ALTER TABLE activity_reactions
  DROP FOREIGN KEY fk_reactions_activity,
  DROP FOREIGN KEY fk_reactions_user;

ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activities CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activity_people CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE weights CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE friend_connections CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activity_reactions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE settings
  ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE activities
  ADD CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE activity_people
  ADD CONSTRAINT fk_activity_people_activity FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE;
ALTER TABLE weights
  ADD CONSTRAINT fk_weights_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE friend_connections
  ADD CONSTRAINT fk_friend_user_1 FOREIGN KEY (user_id_1) REFERENCES users (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_friend_user_2 FOREIGN KEY (user_id_2) REFERENCES users (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_friend_requester FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE activity_reactions
  ADD CONSTRAINT fk_reactions_activity FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
