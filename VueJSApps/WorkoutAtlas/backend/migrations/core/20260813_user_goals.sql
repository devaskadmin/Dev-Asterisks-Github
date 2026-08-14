-- =============================================================================
-- WorkoutAtlas v0.85.40.2 – User Goals
-- Migration: 20260813_user_goals.sql
-- Purpose:   Creates user_goals table for the Goals System.
--            Supports two goal types: body_weight and exercise_weight.
--
-- Safe to run multiple times – uses CREATE TABLE IF NOT EXISTS.
-- Existing tables, plans, and users are unaffected.
-- workout_schedule_exercises.target_weight remains separate (exercise template
-- targets, not long-term user goals).
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_goals (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT(11) NOT NULL,
  goal_type     ENUM('body_weight', 'exercise_weight') NOT NULL,
  -- Nullable: only used when goal_type = 'exercise_weight'
  exercise_id   INT(11) DEFAULT NULL,
  -- Human-readable snapshot of the exercise name at goal-creation time.
  -- Preserved if the exercise is later deleted.
  exercise_name VARCHAR(150) DEFAULT NULL,
  -- Snapshot of the user's value at goal-creation time (optional).
  current_value DECIMAL(8,2) DEFAULT NULL,
  target_value  DECIMAL(8,2) NOT NULL,
  target_unit   VARCHAR(20) NOT NULL DEFAULT 'lb',
  target_date   DATE NOT NULL,
  status        ENUM('active', 'completed', 'archived') NOT NULL DEFAULT 'active',
  completed_at  DATETIME DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ug_user          (user_id),
  KEY idx_ug_user_status   (user_id, status),
  KEY idx_ug_exercise      (exercise_id),
  CONSTRAINT fk_ug_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ug_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises (ExerciseID)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
