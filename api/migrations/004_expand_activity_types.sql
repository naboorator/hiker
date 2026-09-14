ALTER TABLE `activities`
  MODIFY COLUMN `activity_type` ENUM(
    'hiking',
    'fitness',
    'cycling',
    'tennis',
    'badminton',
    'table_tennis',
    'construction',
    'housework'
  ) NOT NULL;
