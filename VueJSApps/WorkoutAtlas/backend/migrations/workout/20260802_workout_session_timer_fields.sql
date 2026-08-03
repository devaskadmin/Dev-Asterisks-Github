-- WorkoutAtlas 0.84.70
-- Add workout-session timer fields only when missing, and extend status values.

SET @db_name = DATABASE();

-- Add ended_at when missing
SET @has_ended_at = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'workout_log_sessions'
    AND COLUMN_NAME = 'ended_at'
);
SET @sql_ended_at = IF(
  @has_ended_at = 0,
  'ALTER TABLE workout_log_sessions ADD COLUMN ended_at DATETIME NULL AFTER started_at',
  'SELECT "ended_at already exists"'
);
PREPARE stmt FROM @sql_ended_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add duration_seconds when missing
SET @has_duration_seconds = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'workout_log_sessions'
    AND COLUMN_NAME = 'duration_seconds'
);
SET @sql_duration_seconds = IF(
  @has_duration_seconds = 0,
  'ALTER TABLE workout_log_sessions ADD COLUMN duration_seconds INT UNSIGNED NOT NULL DEFAULT 0 AFTER ended_at',
  'SELECT "duration_seconds already exists"'
);
PREPARE stmt FROM @sql_duration_seconds;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure status supports in_progress/completed/ended and preserves existing cancelled rows.
ALTER TABLE workout_log_sessions
  MODIFY COLUMN status ENUM('in_progress', 'completed', 'ended', 'cancelled')
  NOT NULL DEFAULT 'in_progress';
