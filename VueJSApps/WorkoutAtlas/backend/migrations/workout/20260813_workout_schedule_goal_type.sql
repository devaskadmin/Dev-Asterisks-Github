-- FlexFit v0.85.40.5 - Global Workout Goal Type foundation
-- Adds optional goal_type classification to workout_schedules.

START TRANSACTION;

ALTER TABLE workout_schedules
  ADD COLUMN goal_type ENUM('none', 'body_weight', 'exercise_weight') NULL DEFAULT NULL AFTER workout_plan_type;

CREATE INDEX idx_workout_schedules_goal_type
  ON workout_schedules (goal_type);

COMMIT;
