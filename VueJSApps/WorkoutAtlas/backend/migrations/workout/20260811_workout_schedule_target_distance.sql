-- Adds target_distance_miles to workout_schedule_exercises so global/day templates
-- can persist per-exercise distance configuration.

SET @has_target_distance_miles = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'workout_schedule_exercises'
    AND column_name = 'target_distance_miles'
);

SET @sql_target_distance_miles = IF(
  @has_target_distance_miles = 0,
  'ALTER TABLE workout_schedule_exercises ADD COLUMN target_distance_miles DECIMAL(8,2) DEFAULT NULL AFTER target_duration_minutes',
  'SELECT "target_distance_miles already exists"'
);

PREPARE stmt FROM @sql_target_distance_miles;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
