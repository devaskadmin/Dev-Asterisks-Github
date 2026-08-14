/**
 * WorkoutAtlas v0.85.40.2 – Goals API
 *
 * Routes (all require authentication):
 *   GET    /api/goals              – list user's goals (optional ?status= filter)
 *   POST   /api/goals              – create a goal
 *   GET    /api/goals/:id          – get a single goal
 *   PATCH  /api/goals/:id          – edit target_value, target_date, current_value
 *   PATCH  /api/goals/:id/complete – mark a goal completed
 *   PATCH  /api/goals/:id/archive  – archive a goal
 *   DELETE /api/goals/:id          – delete a goal
 *
 * Goal types: body_weight | exercise_weight
 *
 * NOTE: workout_schedule_exercises.target_weight is a per-exercise template
 * target and is entirely separate from this system.
 */

'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sanitizeText, parseNumber } = require('../utils/sanitize');

// ─── Constants ────────────────────────────────────────────────────────────────
const VALID_GOAL_TYPES = new Set(['body_weight', 'exercise_weight']);
const VALID_STATUSES   = new Set(['active', 'completed', 'archived']);
const VALID_UNITS      = new Set(['lb', 'kg']);
const ISO_DATE_RE      = /^\d{4}-\d{2}-\d{2}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireAuth(req, res) {
  if (!req.session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return false;
  }
  return true;
}

function isValidIsoDate(str) {
  if (!ISO_DATE_RE.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/** Serialize a DB row into the API shape. */
function serializeGoal(row) {
  return {
    id:           Number(row.id),
    goalType:     row.goal_type,
    exerciseId:   row.exercise_id != null ? Number(row.exercise_id) : null,
    exerciseName: row.exercise_name || null,
    currentValue: row.current_value != null ? Number(row.current_value) : null,
    targetValue:  Number(row.target_value),
    targetUnit:   row.target_unit,
    targetDate:   row.target_date instanceof Date
      ? row.target_date.toISOString().slice(0, 10)
      : String(row.target_date || '').slice(0, 10),
    status:       row.status,
    completedAt:  row.completed_at
      ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : String(row.completed_at))
      : null,
    createdAt:    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
    updatedAt:    row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ''),
  };
}

// ─── GET /api/goals ───────────────────────────────────────────────────────────
// List all goals for the logged-in user.
// Optional query param: ?status=active|completed|archived
router.get('/goals', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.user.id;

  const rawStatus = String(req.query?.status || '').trim().toLowerCase();
  const statusFilter = VALID_STATUSES.has(rawStatus) ? rawStatus : null;

  try {
    let query = 'SELECT * FROM user_goals WHERE user_id = ?';
    const params = [userId];

    if (statusFilter) {
      query += ' AND status = ?';
      params.push(statusFilter);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    return res.json({ goals: rows.map(serializeGoal) });
  } catch (err) {
    console.error('❌ GET /api/goals:', err);
    return res.status(500).json({ error: 'Failed to load goals.' });
  }
});

// ─── POST /api/goals ──────────────────────────────────────────────────────────
// Create a new goal.
router.post('/goals', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.user.id;

  const body = req.body || {};
  const goalType = String(body.goalType || '').trim().toLowerCase();

  if (!VALID_GOAL_TYPES.has(goalType)) {
    return res.status(400).json({ error: 'goalType must be "body_weight" or "exercise_weight".' });
  }

  const targetValue = parseNumber(body.targetValue, true);
  if (targetValue == null || targetValue <= 0) {
    return res.status(400).json({ error: 'targetValue must be a positive number.' });
  }

  const rawDate = String(body.targetDate || '').trim();
  if (!isValidIsoDate(rawDate)) {
    return res.status(400).json({ error: 'targetDate must be a valid YYYY-MM-DD date.' });
  }

  const unit = VALID_UNITS.has(String(body.targetUnit || '').trim().toLowerCase())
    ? String(body.targetUnit).trim().toLowerCase()
    : 'lb';

  const currentValue = body.currentValue != null ? parseNumber(body.currentValue, true) : null;

  // ── exercise_weight specific validation ──────────────────────────────────
  let exerciseId = null;
  let exerciseName = null;

  if (goalType === 'exercise_weight') {
    const rawExerciseId = parseNumber(body.exerciseId);
    if (!rawExerciseId) {
      return res.status(400).json({ error: 'exerciseId is required for exercise_weight goals.' });
    }

    const [exRows] = await pool.query(
      'SELECT ExerciseID, ExerciseTitle FROM exercises WHERE ExerciseID = ? LIMIT 1',
      [rawExerciseId]
    );

    if (!exRows.length) {
      return res.status(400).json({ error: 'Exercise not found. exerciseId must reference an existing exercise.' });
    }

    exerciseId = Number(exRows[0].ExerciseID);
    exerciseName = sanitizeText(
      String(body.exerciseName || exRows[0].ExerciseTitle || '').trim(),
      150
    );
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO user_goals
         (user_id, goal_type, exercise_id, exercise_name, current_value, target_value, target_unit, target_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, goalType, exerciseId, exerciseName, currentValue, targetValue, unit, rawDate]
    );

    const [[newRow]] = await pool.query('SELECT * FROM user_goals WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ message: 'Goal created.', goal: serializeGoal(newRow) });
  } catch (err) {
    console.error('❌ POST /api/goals:', err);
    return res.status(500).json({ error: 'Failed to create goal.' });
  }
});

// ─── GET /api/goals/:id ───────────────────────────────────────────────────────
// Get a single goal.
router.get('/goals/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.user.id;
  const goalId = Number(req.params?.id || 0);

  if (!goalId) return res.status(400).json({ error: 'Invalid goal id.' });

  try {
    const [[row]] = await pool.query(
      'SELECT * FROM user_goals WHERE id = ? AND user_id = ? LIMIT 1',
      [goalId, userId]
    );

    if (!row) return res.status(404).json({ error: 'Goal not found.' });
    return res.json({ goal: serializeGoal(row) });
  } catch (err) {
    console.error('❌ GET /api/goals/:id:', err);
    return res.status(500).json({ error: 'Failed to load goal.' });
  }
});

// ─── PATCH /api/goals/:id ────────────────────────────────────────────────────
// Edit targetValue, targetDate, and/or currentValue.
// Also allows updating exerciseName (display override only).
router.patch('/goals/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.user.id;
  const goalId = Number(req.params?.id || 0);

  if (!goalId) return res.status(400).json({ error: 'Invalid goal id.' });

  const body = req.body || {};

  // Verify ownership
  const [[existing]] = await pool.query(
    'SELECT * FROM user_goals WHERE id = ? AND user_id = ? LIMIT 1',
    [goalId, userId]
  );
  if (!existing) return res.status(404).json({ error: 'Goal not found.' });
  if (existing.status === 'archived') {
    return res.status(400).json({ error: 'Archived goals cannot be edited.' });
  }

  const setClauses = [];
  const params = [];

  if (body.targetValue != null) {
    const tv = parseNumber(body.targetValue, true);
    if (tv == null || tv <= 0) return res.status(400).json({ error: 'targetValue must be a positive number.' });
    setClauses.push('target_value = ?');
    params.push(tv);
  }

  if (body.targetDate != null) {
    const rawDate = String(body.targetDate || '').trim();
    if (!isValidIsoDate(rawDate)) return res.status(400).json({ error: 'targetDate must be YYYY-MM-DD.' });
    setClauses.push('target_date = ?');
    params.push(rawDate);
  }

  if (body.currentValue != null) {
    const cv = parseNumber(body.currentValue, true);
    if (cv == null || cv < 0) return res.status(400).json({ error: 'currentValue must be a non-negative number.' });
    setClauses.push('current_value = ?');
    params.push(cv);
  }

  if (body.targetUnit != null) {
    const u = String(body.targetUnit || '').trim().toLowerCase();
    if (!VALID_UNITS.has(u)) return res.status(400).json({ error: 'targetUnit must be "lb" or "kg".' });
    setClauses.push('target_unit = ?');
    params.push(u);
  }

  if (body.exerciseName != null && existing.goal_type === 'exercise_weight') {
    setClauses.push('exercise_name = ?');
    params.push(sanitizeText(String(body.exerciseName || '').trim(), 150));
  }

  if (!setClauses.length) {
    return res.status(400).json({ error: 'No updatable fields provided.' });
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  params.push(goalId, userId);

  try {
    await pool.query(
      `UPDATE user_goals SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [[updated]] = await pool.query('SELECT * FROM user_goals WHERE id = ? LIMIT 1', [goalId]);
    return res.json({ message: 'Goal updated.', goal: serializeGoal(updated) });
  } catch (err) {
    console.error('❌ PATCH /api/goals/:id:', err);
    return res.status(500).json({ error: 'Failed to update goal.' });
  }
});

// ─── PATCH /api/goals/:id/complete ────────────────────────────────────────────
// Mark a goal as completed.
router.patch('/goals/:id/complete', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.user.id;
  const goalId = Number(req.params?.id || 0);

  if (!goalId) return res.status(400).json({ error: 'Invalid goal id.' });

  const [[existing]] = await pool.query(
    'SELECT id, status FROM user_goals WHERE id = ? AND user_id = ? LIMIT 1',
    [goalId, userId]
  );
  if (!existing) return res.status(404).json({ error: 'Goal not found.' });
  if (existing.status === 'completed') return res.status(400).json({ error: 'Goal is already completed.' });

  try {
    await pool.query(
      `UPDATE user_goals
       SET status = 'completed', completed_at = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [goalId, userId]
    );

    const [[updated]] = await pool.query('SELECT * FROM user_goals WHERE id = ? LIMIT 1', [goalId]);
    return res.json({ message: 'Goal marked as completed.', goal: serializeGoal(updated) });
  } catch (err) {
    console.error('❌ PATCH /api/goals/:id/complete:', err);
    return res.status(500).json({ error: 'Failed to complete goal.' });
  }
});

// ─── PATCH /api/goals/:id/archive ────────────────────────────────────────────
// Archive a goal (soft-remove from active list).
router.patch('/goals/:id/archive', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.user.id;
  const goalId = Number(req.params?.id || 0);

  if (!goalId) return res.status(400).json({ error: 'Invalid goal id.' });

  const [[existing]] = await pool.query(
    'SELECT id, status FROM user_goals WHERE id = ? AND user_id = ? LIMIT 1',
    [goalId, userId]
  );
  if (!existing) return res.status(404).json({ error: 'Goal not found.' });
  if (existing.status === 'archived') return res.status(400).json({ error: 'Goal is already archived.' });

  try {
    await pool.query(
      `UPDATE user_goals
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [goalId, userId]
    );

    const [[updated]] = await pool.query('SELECT * FROM user_goals WHERE id = ? LIMIT 1', [goalId]);
    return res.json({ message: 'Goal archived.', goal: serializeGoal(updated) });
  } catch (err) {
    console.error('❌ PATCH /api/goals/:id/archive:', err);
    return res.status(500).json({ error: 'Failed to archive goal.' });
  }
});

// ─── DELETE /api/goals/:id ────────────────────────────────────────────────────
// Permanently delete a goal.
router.delete('/goals/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.user.id;
  const goalId = Number(req.params?.id || 0);

  if (!goalId) return res.status(400).json({ error: 'Invalid goal id.' });

  try {
    const [result] = await pool.query(
      'DELETE FROM user_goals WHERE id = ? AND user_id = ?',
      [goalId, userId]
    );

    if (!result.affectedRows) return res.status(404).json({ error: 'Goal not found.' });
    return res.json({ message: 'Goal deleted.' });
  } catch (err) {
    console.error('❌ DELETE /api/goals/:id:', err);
    return res.status(500).json({ error: 'Failed to delete goal.' });
  }
});

module.exports = router;
