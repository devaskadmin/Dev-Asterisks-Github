import { ref } from 'vue';
import { API_BASE } from '@/config/env';

const DRAFT_SAVE_DELAY_MS = 350;

const normalizeNumber = (value) => Number(value || 0);

const normalizeSet = (set = {}, fallbackSetNum = 0) => ({
  setNum: Number(set?.setNum || fallbackSetNum || 0),
  weight: normalizeNumber(set?.weight),
  reps: normalizeNumber(set?.reps),
  duration: normalizeNumber(set?.duration),
  caloriesBurned: normalizeNumber(set?.caloriesBurned),
  distanceMiles: normalizeNumber(set?.distanceMiles),
  speedMph: normalizeNumber(set?.speedMph),
  done: Boolean(set?.done),
  notes: typeof set?.notes === 'string' ? set.notes : '',
  prefilledFields: set?.prefilledFields && typeof set.prefilledFields === 'object'
    ? { ...set.prefilledFields }
    : {},
  prefilledFromLastWorkout: Boolean(set?.prefilledFromLastWorkout),
});

const serializeExercise = (exercise = {}) => ({
  id: String(exercise?.id || ''),
  exerciseId: exercise?.exerciseId ?? null,
  sessionSets: Array.isArray(exercise?.sessionSets)
    ? exercise.sessionSets.map((set, index) => normalizeSet(set, index + 1))
    : [],
});

const parseDraftNotes = (notes) => {
  if (!notes) {
    return null;
  }

  if (typeof notes === 'object') {
    return notes;
  }

  if (typeof notes !== 'string') {
    return null;
  }

  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
};

export function useWorkoutSessionDraft({ activeSession, sessionExercises }) {
  const draftSaveTimer = ref(null);
  const isHydratingDraft = ref(false);
  const isSavingDraft = ref(false);

  const clearWorkoutDraftSave = () => {
    if (draftSaveTimer.value != null) {
      window.clearTimeout(draftSaveTimer.value);
      draftSaveTimer.value = null;
    }
  };

  const getSessionId = () => Number(activeSession.value?.id || 0);

  const buildDraftPayload = () => ({
    version: 1,
    exercises: Array.isArray(sessionExercises.value)
      ? sessionExercises.value.map((exercise) => serializeExercise(exercise))
      : [],
  });

  const applyWorkoutDraft = (draftNotes) => {
    const draft = parseDraftNotes(draftNotes);
    const draftExercises = Array.isArray(draft?.exercises) ? draft.exercises : [];

    if (!draftExercises.length || !Array.isArray(sessionExercises.value)) {
      return false;
    }

    const draftById = new Map(
      draftExercises
        .map((exercise) => [String(exercise?.id || exercise?.exerciseId || ''), exercise])
        .filter(([key]) => Boolean(key))
    );

    if (draftById.size === 0) {
      return false;
    }

    isHydratingDraft.value = true;
    sessionExercises.value = sessionExercises.value.map((exercise) => {
      const draftExercise = draftById.get(String(exercise?.id || exercise?.exerciseId || ''));
      const draftSets = Array.isArray(draftExercise?.sessionSets) ? draftExercise.sessionSets : null;

      if (!draftSets || draftSets.length === 0) {
        return exercise;
      }

      return {
        ...exercise,
        sessionSets: draftSets.map((set, index) => normalizeSet(set, index + 1)),
      };
    });
    isHydratingDraft.value = false;
    return true;
  };

  const persistWorkoutDraft = async () => {
    clearWorkoutDraftSave();

    const sessionId = getSessionId();
    if (!sessionId || isHydratingDraft.value || !activeSession.value) {
      return false;
    }

    isSavingDraft.value = true;
    try {
      const response = await fetch(`${API_BASE}/api/workout-sessions/${sessionId}/draft`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDraftPayload()),
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      isSavingDraft.value = false;
    }
  };

  const queueWorkoutDraftSave = (immediate = false) => {
    if (isHydratingDraft.value || !activeSession.value) {
      return;
    }

    clearWorkoutDraftSave();

    if (immediate) {
      void persistWorkoutDraft();
      return;
    }

    draftSaveTimer.value = window.setTimeout(() => {
      void persistWorkoutDraft();
    }, DRAFT_SAVE_DELAY_MS);
  };

  return {
    applyWorkoutDraft,
    clearWorkoutDraftSave,
    isSavingDraft,
    persistWorkoutDraft,
    queueWorkoutDraftSave,
  };
}