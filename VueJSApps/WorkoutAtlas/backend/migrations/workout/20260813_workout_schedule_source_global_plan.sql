-- FlexFit v0.85.40.7
-- Persist provenance of user-adopted global workout plans.

START TRANSACTION;

ALTER TABLE workout_schedules
  ADD COLUMN source_global_plan_id BIGINT UNSIGNED NULL AFTER workout_plan_type,
  ADD COLUMN global_plan_adopted_at DATETIME NULL AFTER source_global_plan_id;

CREATE INDEX idx_workout_schedules_source_global
  ON workout_schedules (source_global_plan_id);

ALTER TABLE workout_schedules
  ADD CONSTRAINT fk_workout_schedules_source_global
  FOREIGN KEY (source_global_plan_id) REFERENCES workout_schedules(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
