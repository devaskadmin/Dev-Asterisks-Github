-- FlexFit v0.85.40.4
-- Optional one-to-one link from a personal workout schedule to a user goal.
-- Source of truth for goal details remains user_goals.

ALTER TABLE workout_schedules
  ADD COLUMN linked_goal_id BIGINT UNSIGNED NULL AFTER workout_plan_type,
  ADD KEY idx_workout_schedules_goal_id (linked_goal_id),
  ADD CONSTRAINT fk_workout_schedules_goal
    FOREIGN KEY (linked_goal_id) REFERENCES user_goals(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
