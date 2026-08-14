<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  metadata: {
    type: Object,
    required: true,
  },
  canCreateFeaturedPlans: {
    type: Boolean,
    default: false,
  },
  goalOptions: {
    type: Array,
    default: () => [],
  },
  loadingGoals: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:metadata']);

const isAdminPlanTypeEnabled = computed(() => Boolean(props.canCreateFeaturedPlans));

const workoutGoalChips = [
  'Lose Weight',
  'Build Muscle',
  'Gain Strength',
  'Improve Endurance',
  'Stay in Shape',
  'Improve Mobility',
  'General Fitness',
  'Other',
];

const selectedGoals = computed(() => (Array.isArray(props.metadata?.goals) ? props.metadata.goals : []));

const formatGoalContextDate = (rawDate) => {
  const raw = String(rawDate || '').trim();
  if (!raw) return 'N/A';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const selectedGoalContext = computed(() => {
  const selectedGoalId = String(props.metadata?.goalId || '').trim();
  if (!selectedGoalId) return null;

  const selectedOption = (Array.isArray(props.goalOptions) ? props.goalOptions : [])
    .find((option) => String(option?.value || '').trim() === selectedGoalId);

  if (String(selectedOption?.goalType || '').trim() === 'exercise_weight') {
    return {
      exerciseName: String(selectedOption?.exerciseName || 'Exercise').trim() || 'Exercise',
      targetValue: Number(selectedOption?.targetValue || 0),
      targetUnit: String(selectedOption?.targetUnit || 'lb').trim() || 'lb',
      targetDate: String(selectedOption?.targetDate || '').trim(),
      status: 'active',
    };
  }

  const fallback = props.metadata?.goalContext;
  if (fallback && typeof fallback === 'object' && String(fallback?.goalType || '').trim() === 'exercise_weight') {
    return {
      exerciseName: String(fallback?.exerciseName || 'Exercise').trim() || 'Exercise',
      targetValue: Number(fallback?.targetValue || 0),
      targetUnit: String(fallback?.targetUnit || 'lb').trim() || 'lb',
      targetDate: String(fallback?.targetDate || '').trim(),
      status: String(fallback?.status || '').trim().toLowerCase(),
    };
  }

  return null;
});

const updateMetadata = (patch) => {
  emit('update:metadata', {
    ...props.metadata,
    ...patch,
  });
};

const updateField = (field, value) => {
  updateMetadata({ [field]: value });
};

const isGoalSelected = (goal) => selectedGoals.value.includes(goal);

const toggleGoal = (goal) => {
  const nextGoals = new Set(selectedGoals.value);

  if (nextGoals.has(goal)) {
    nextGoals.delete(goal);
    const patch = { goals: Array.from(nextGoals) };
    if (goal === 'Other') {
      patch.otherGoal = '';
    }
    updateMetadata(patch);
    return;
  }

  nextGoals.add(goal);
  updateMetadata({ goals: Array.from(nextGoals) });
};

watch(
  () => props.canCreateFeaturedPlans,
  (canCreate) => {
    if (canCreate) return;
    if (String(props.metadata?.planType || '').trim() === '') return;
    updateMetadata({ planType: '' });
  },
  { immediate: true }
)
</script>

<template>
  <div class="builder-metadata-layout">
    <div class="builder-grid">
      <label class="builder-field builder-field--row">
        <span>Plan Name</span>
        <input
          :value="metadata.name"
          type="text"
          placeholder="e.g., Upper Body Power"
          @input="updateField('name', $event.target.value)"
        />
      </label>

      <label class="builder-field builder-field--duration builder-field--row">
        <span>Est. Time (min)</span>
        <input
          :value="metadata.estimatedDuration"
          type="number"
          min="1"
          placeholder="45"
          @input="updateField('estimatedDuration', Number($event.target.value || 0))"
        />
      </label>

      <label class="builder-field builder-field--row">
        <span>Workout Type</span>
        <select :value="metadata.type" @change="updateField('type', $event.target.value)">
          <option value="Strength">Strength</option>
          <option value="Cardio">Cardio</option>
          <option value="Hybrid">Hybrid</option>
          <option value="Mobility">Mobility</option>
        </select>
      </label>

      <label class="builder-field builder-field--row">
        <span>Goal</span>
        <select
          :value="String(metadata.goalId || '')"
          :disabled="loadingGoals"
          @change="updateField('goalId', String($event.target.value || ''))"
        >
          <option
            v-for="option in goalOptions"
            :key="`goal-${String(option.value)}`"
            :value="String(option.value)"
          >
            {{ option.label }}
          </option>
        </select>
        <small class="builder-field__hint">
          {{ loadingGoals ? 'Loading active goals...' : 'Manage goal details in Profile > My Goals.' }}
        </small>
        <div v-if="selectedGoalContext" class="goal-context-note" role="note" aria-live="polite">
          <strong>Exercise Goal Context:</strong>
          {{ selectedGoalContext.exerciseName }} target {{ selectedGoalContext.targetValue }} {{ selectedGoalContext.targetUnit }} by {{ formatGoalContextDate(selectedGoalContext.targetDate) }}.
          <span v-if="selectedGoalContext.status === 'archived'"> This linked goal is archived.</span>
          <span class="goal-context-note__subtle"> This does not modify per-exercise Target Weight values in the schedule.</span>
        </div>
      </label>

      <label v-if="isAdminPlanTypeEnabled" class="builder-field builder-field--row">
        <span>Workout Plan Type</span>
        <select :value="metadata.planType || ''" @change="updateField('planType', $event.target.value)">
          <option value="">Standard (Personal)</option>
          <option value="featured">Featured (Admin only)</option>
          <option value="community_shared" disabled>Community Shared (Coming Soon)</option>
        </select>
      </label>

      <label class="builder-field builder-field--wide">
        <span>Description</span>
        <textarea
          :value="metadata.description"
          rows="2"
          placeholder="Overview of this workout plan"
          @input="updateField('description', $event.target.value)"
        />
      </label>

      <div class="builder-field builder-field--wide">
        <span>Workout Goals</span>
        <div class="goal-chip-grid" role="group" aria-label="Workout goals">
          <button
            v-for="goal in workoutGoalChips"
            :key="goal"
            type="button"
            class="goal-chip"
            :class="{ active: isGoalSelected(goal) }"
            :aria-pressed="isGoalSelected(goal)"
            @click="toggleGoal(goal)"
          >
            {{ goal }}
          </button>
        </div>
        <label v-if="isGoalSelected('Other')" class="builder-field builder-field--other-goal">
          <span class="builder-field__hint">Optional: specify another goal</span>
          <input
            :value="metadata.otherGoal || ''"
            type="text"
            placeholder="Enter another goal"
            @input="updateField('otherGoal', $event.target.value)"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-metadata-layout {
  display: grid;
  gap: 6px;
}

.builder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.builder-field {
  display: grid;
  gap: 5px;
}

.builder-field--row {
  grid-column: span 2;
}

.builder-field--wide {
  grid-column: span 2;
}

.builder-inline-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
}

.builder-field--duration {
  width: 100%;
}

@media (min-width: 769px) {
  .builder-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .builder-field--row {
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    column-gap: 12px;
    row-gap: 0;
  }

  .builder-field--row > span {
    margin: 0;
    align-self: center;
  }

  .builder-field--row > input,
  .builder-field--row > select {
    width: 100%;
    min-width: 0;
  }

  .builder-field--duration {
    width: auto;
  }
}

.builder-field span {
  font-size: 0.8rem;
  font-weight: 700;
  color: #243447;
}

.builder-field__hint {
  font-size: 0.7rem;
  color: #8fa1bd;
  line-height: 1.25;
}

.goal-context-note {
  margin-top: 4px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 0.74rem;
  line-height: 1.4;
}

.goal-context-note__subtle {
  display: block;
  margin-top: 2px;
  color: #1d4ed8;
}

.builder-field input,
.builder-field select,
.builder-field textarea {
  width: 100%;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  background: #f8fafc;
  min-height: 36px;
  padding: 7px 9px;
  color: #0f172a;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.builder-field input:focus,
.builder-field select:focus,
.builder-field textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
  background: #ffffff;
}

.builder-field textarea {
  min-height: 56px;
  resize: vertical;
}

.goal-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.goal-chip {
  appearance: none;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  border-radius: 999px;
  min-height: 34px;
  padding: 0 12px;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.goal-chip:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.goal-chip.active {
  background: #2563eb;
  border-color: #1d4ed8;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.18);
}

.builder-field--other-goal {
  margin-top: 2px;
}

.builder-field--other-goal .builder-field__hint {
  margin-top: 2px;
}

@media (min-width: 769px) {
  .builder-field--row > .builder-field__hint,
  .builder-field--row > .goal-context-note {
    grid-column: 2;
    margin-top: 2px;
  }
}

@media (max-width: 768px) {
  .builder-metadata-layout {
    gap: 6px;
    min-width: 0;
  }

  .builder-grid {
    grid-template-columns: 1fr;
    gap: 6px;
    min-width: 0;
  }

  .builder-field--row,
  .builder-field--wide {
    grid-column: span 1;
    grid-template-columns: 1fr;
  }

  .builder-field--row > span,
  .builder-field--row > input,
  .builder-field--row > select,
  .builder-field--row > .builder-field__hint,
  .builder-field--row > .goal-context-note {
    grid-column: 1;
    width: 100%;
    min-width: 0;
  }

  .builder-field--duration {
    width: 100%;
  }

  .builder-field {
    gap: 4px;
  }

  .builder-field span {
    font-size: 0.75rem;
  }

  .builder-field input,
  .builder-field select {
    min-height: 36px;
    padding: 7px 9px;
    font-size: 0.82rem;
    border-radius: 8px;
  }

  .builder-field textarea {
    min-height: 52px;
    padding: 7px 9px;
    font-size: 0.82rem;
    border-radius: 8px;
  }

  .goal-chip-grid {
    gap: 6px;
  }

  .goal-chip {
    min-height: 32px;
    padding: 0 10px;
    font-size: 0.76rem;
  }
}

@media (max-width: 480px) {
  .builder-field input,
  .builder-field select {
    min-height: 34px;
    font-size: 0.78rem;
    padding: 6px 8px;
  }

  .builder-field span {
    font-size: 0.73rem;
  }

  .goal-chip {
    min-height: 30px;
    padding: 0 9px;
    font-size: 0.72rem;
  }
}
</style>
