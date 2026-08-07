-- FlexFit v0.85.gb.1 - Global Workout Plan Type foundation
-- Adds optional global workout plan type classification to workout_schedules.

START TRANSACTION;

ALTER TABLE workout_schedules
  ADD COLUMN workout_plan_type ENUM('featured', 'community_shared') NULL DEFAULT NULL AFTER workout_type;

CREATE INDEX idx_workout_schedules_plan_type
  ON workout_schedules (workout_plan_type);

COMMIT;
