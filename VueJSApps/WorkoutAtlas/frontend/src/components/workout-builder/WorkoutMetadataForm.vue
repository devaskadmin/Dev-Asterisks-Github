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
});

const emit = defineEmits(['update:metadata']);

const isAdminPlanTypeEnabled = computed(() => Boolean(props.canCreateFeaturedPlans));

const goalOptions = [
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
      <label class="builder-field">
        <span>Plan Name</span>
        <input
          :value="metadata.name"
          type="text"
          placeholder="e.g., Upper Body Power"
          @input="updateField('name', $event.target.value)"
        />
      </label>

      <label class="builder-field builder-field--duration">
        <span>Est. Time (min)</span>
        <input
          :value="metadata.estimatedDuration"
          type="number"
          min="1"
          placeholder="45"
          @input="updateField('estimatedDuration', Number($event.target.value || 0))"
        />
      </label>

      <label class="builder-field">
        <span>Workout Type</span>
        <select :value="metadata.type" @change="updateField('type', $event.target.value)">
          <option value="Strength">Strength</option>
          <option value="Cardio">Cardio</option>
          <option value="Hybrid">Hybrid</option>
          <option value="Mobility">Mobility</option>
        </select>
      </label>

      <label v-if="isAdminPlanTypeEnabled" class="builder-field">
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
            v-for="goal in goalOptions"
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

.builder-field span {
  font-size: 0.8rem;
  font-weight: 700;
  color: #243447;
}

.builder-field__hint {
  font-size: 0.74rem;
  color: #64748b;
  line-height: 1.35;
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
@media (max-width: 768px) {
  .builder-metadata-layout {
    gap: 6px;
  }

  .builder-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .builder-field--wide {
    grid-column: span 1;
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
