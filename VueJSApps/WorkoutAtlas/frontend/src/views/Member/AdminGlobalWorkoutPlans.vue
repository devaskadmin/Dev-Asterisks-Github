<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { API_BASE } from '@/config/env'

const loading = ref(false)
const saving = ref(false)
const deletingId = ref('')
const plans = ref([])
const selectedPlan = ref(null)
const editingId = ref('')
const errorMsg = ref('')
const successMsg = ref('')

const scheduleEditor = reactive({
  open: false,
  loading: false,
  saving: false,
  planId: '',
  planName: '',
  metadata: {
    name: '',
    description: '',
    type: 'Strength',
    planType: 'featured',
    estimatedDuration: 45,
  },
  scheduleMode: 'day',
  dayGroups: ['Any Day'],
  weekGroups: ['Week 1'],
  exercises: [],
})

const form = reactive({
  name: '',
  description: '',
  planType: 'featured',
  estimatedDuration: 45,
})

const isEditing = computed(() => Boolean(String(editingId.value || '').trim()))
const activeScheduleGroups = computed(() => {
  const groups = scheduleEditor.scheduleMode === 'week' ? scheduleEditor.weekGroups : scheduleEditor.dayGroups
  return Array.isArray(groups) && groups.length ? groups : [scheduleEditor.scheduleMode === 'week' ? 'Week 1' : 'Any Day']
})

const clearMessages = () => {
  errorMsg.value = ''
  successMsg.value = ''
}

const sanitizeGroupLabels = (labels = [], fallbackLabel = 'Any Day') => {
  const normalized = labels
    .map((label) => String(label || '').trim())
    .filter(Boolean)
    .filter((label, index, source) => source.findIndex((entry) => entry.toLowerCase() === label.toLowerCase()) === index)
  return normalized.length ? normalized : [fallbackLabel]
}

const normalizeEditorExercise = (exercise = {}, fallbackGroup = 'Any Day') => ({
  id: String(exercise?.id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  exerciseId: Number(exercise?.exerciseId || 0),
  name: String(exercise?.name || '').trim(),
  image: String(exercise?.image || '').trim(),
  workoutType: String(exercise?.workoutType || 'Strength').trim() || 'Strength',
  muscleGroup: String(exercise?.muscleGroup || '').trim(),
  equipment: String(exercise?.equipment || '').trim(),
  sets: Number(exercise?.sets || 0),
  reps: Number(exercise?.reps || 0),
  weight: Number(exercise?.weight || 0),
  duration: Number(exercise?.duration || 0),
  restTime: Number(exercise?.restTime || 0),
  notes: String(exercise?.notes || '').trim(),
  scheduleGroup: String(exercise?.scheduleGroup || fallbackGroup).trim() || fallbackGroup,
})

const ensureEditorExerciseGroups = () => {
  const fallbackGroup = activeScheduleGroups.value[0]
  scheduleEditor.exercises = scheduleEditor.exercises.map((exercise) => {
    if (activeScheduleGroups.value.includes(exercise.scheduleGroup)) {
      return exercise
    }
    return { ...exercise, scheduleGroup: fallbackGroup }
  })
}

const normalizePlan = (plan = {}) => ({
  planId: String(plan.planId || '').trim(),
  name: String(plan.name || '').trim() || 'Untitled Workout',
  description: String(plan.description || '').trim(),
  planType: String(plan.planType || 'featured').trim() || 'featured',
  estimatedDuration: Number(plan.estimatedDuration || 0),
  updatedAt: plan.updatedAt || null,
  exerciseCount: Number(plan.exerciseCount || 0),
})

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString()
}

const planTypeLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'community_shared') return 'Community Shared'
  return 'Featured'
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.planType = 'featured'
  form.estimatedDuration = 45
  editingId.value = ''
}

const loadPlans = async () => {
  loading.value = true
  clearMessages()
  try {
    const res = await axios.get(`${API_BASE}/api/admin/global-workout-plans`, { withCredentials: true })
    plans.value = Array.isArray(res.data?.workoutLists)
      ? res.data.workoutLists.map(normalizePlan)
      : []
  } catch (err) {
    const status = Number(err?.response?.status || 0)
    const apiError = String(err?.response?.data?.error || '').trim().toLowerCase()

    // Backward-compatible no-data handling: if the API path returns a not-found/no-data shape,
    // keep the table visible with an empty list instead of showing a failure banner.
    if (status === 404 || apiError.includes('no global workout plans')) {
      plans.value = []
      errorMsg.value = ''
      return
    }

    errorMsg.value = err.response?.data?.error || 'Failed to load global workout plans.'
  } finally {
    loading.value = false
  }
}

const createPlan = async () => {
  if (!form.name.trim()) {
    errorMsg.value = 'Plan Name is required.'
    return
  }

  saving.value = true
  clearMessages()
  try {
    const res = await axios.post(
      `${API_BASE}/api/admin/global-workout-plans`,
      {
        title: form.name,
        description: form.description,
        planType: form.planType,
        estimatedDurationMinutes: Number(form.estimatedDuration || 0),
      },
      { withCredentials: true }
    )

    plans.value = Array.isArray(res.data?.workoutLists)
      ? res.data.workoutLists.map(normalizePlan)
      : plans.value

    const newPlanId = String(res.data?.planner?.planId || '').trim()
    if (newPlanId) {
      await viewPlan(newPlanId)
    }

    successMsg.value = 'Global workout plan created.'
    resetForm()
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to create global workout plan.'
  } finally {
    saving.value = false
  }
}

const updatePlan = async () => {
  const targetId = String(editingId.value || '').trim()
  if (!targetId) {
    errorMsg.value = 'No plan selected for edit.'
    return
  }

  if (!form.name.trim()) {
    errorMsg.value = 'Plan Name is required.'
    return
  }

  saving.value = true
  clearMessages()
  try {
    const res = await axios.patch(
      `${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(targetId)}`,
      {
        title: form.name,
        description: form.description,
        planType: form.planType,
        estimatedDurationMinutes: Number(form.estimatedDuration || 0),
      },
      { withCredentials: true }
    )

    plans.value = Array.isArray(res.data?.workoutLists)
      ? res.data.workoutLists.map(normalizePlan)
      : plans.value

    await viewPlan(targetId)
    successMsg.value = 'Global workout plan updated.'
    resetForm()
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to update global workout plan.'
  } finally {
    saving.value = false
  }
}

const savePlan = async () => {
  if (isEditing.value) {
    await updatePlan()
    return
  }
  await createPlan()
}

const viewPlan = async (planId) => {
  const targetId = String(planId || '').trim()
  if (!targetId) {
    selectedPlan.value = null
    return
  }

  clearMessages()
  try {
    const res = await axios.get(
      `${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(targetId)}`,
      { withCredentials: true }
    )

    const planner = res.data?.planner || {}
    const metadata = planner?.metadata || {}

    selectedPlan.value = {
      planId: String(planner.planId || targetId),
      name: String(metadata.name || '').trim() || 'Untitled Workout',
      description: String(metadata.description || '').trim(),
      planType: String(metadata.planType || 'featured').trim() || 'featured',
      estimatedDuration: Number(metadata.estimatedDuration || 0),
      exerciseCount: Array.isArray(planner.exercises) ? planner.exercises.length : 0,
      updatedAt: planner.updatedAt || null,
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to load plan details.'
  }
}

const editPlan = (plan) => {
  const planData = normalizePlan(plan)
  editingId.value = planData.planId
  form.name = planData.name
  form.description = planData.description
  form.planType = planData.planType === 'community_shared' ? 'community_shared' : 'featured'
  form.estimatedDuration = Number(planData.estimatedDuration || 0)
  clearMessages()
}

const deletePlan = async (plan) => {
  const targetId = String(plan?.planId || '').trim()
  if (!targetId) {
    return
  }

  const confirmed = window.confirm(`Delete ${plan?.name || 'this plan'}?`)
  if (!confirmed) {
    return
  }

  deletingId.value = targetId
  clearMessages()
  try {
    const res = await axios.delete(
      `${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(targetId)}`,
      { withCredentials: true }
    )

    plans.value = Array.isArray(res.data?.workoutLists)
      ? res.data.workoutLists.map(normalizePlan)
      : plans.value.filter((item) => String(item.planId) !== targetId)

    if (String(selectedPlan.value?.planId || '') === targetId) {
      selectedPlan.value = null
    }
    if (String(editingId.value || '') === targetId) {
      resetForm()
    }

    successMsg.value = 'Global workout plan deleted.'
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to delete global workout plan.'
  } finally {
    deletingId.value = ''
  }
}

const openInWorkoutBuilder = (plan) => {
  const planId = String(plan?.planId || selectedPlan.value?.planId || '').trim()
  if (!planId) {
    return
  }

  void openScheduleEditor(planId)
}

const openScheduleEditor = async (planOrId) => {
  const planId = String(planOrId?.planId || planOrId || '').trim()
  if (!planId) {
    return
  }

  scheduleEditor.open = true
  scheduleEditor.loading = true
  clearMessages()

  try {
    const res = await axios.get(
      `${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(planId)}`,
      { withCredentials: true }
    )

    const planner = res.data?.planner || {}
    const metadata = planner?.metadata || {}
    const mode = String(planner?.scheduleMode || 'day').trim() === 'week' ? 'week' : 'day'

    const dayGroups = sanitizeGroupLabels(planner?.dayGroups || [], 'Any Day')
    const weekGroups = sanitizeGroupLabels(planner?.weekGroups || [], 'Week 1')
    const fallbackGroup = mode === 'week' ? weekGroups[0] : dayGroups[0]

    scheduleEditor.planId = planId
    scheduleEditor.planName = String(metadata?.name || '').trim() || 'Untitled Workout'
    scheduleEditor.metadata = {
      name: String(metadata?.name || '').trim() || 'Untitled Workout',
      description: String(metadata?.description || '').trim(),
      type: String(metadata?.type || 'Strength').trim() || 'Strength',
      planType: String(metadata?.planType || 'featured').trim() || 'featured',
      estimatedDuration: Number(metadata?.estimatedDuration || 0),
    }
    scheduleEditor.scheduleMode = mode
    scheduleEditor.dayGroups = dayGroups
    scheduleEditor.weekGroups = weekGroups
    scheduleEditor.exercises = Array.isArray(planner?.exercises)
      ? planner.exercises.map((exercise) => normalizeEditorExercise(exercise, fallbackGroup))
      : []

    ensureEditorExerciseGroups()
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to load global workout plan schedule.'
    scheduleEditor.open = false
  } finally {
    scheduleEditor.loading = false
  }
}

const addScheduleGroup = () => {
  if (scheduleEditor.scheduleMode === 'week') {
    const nextLabel = `Week ${scheduleEditor.weekGroups.length + 1}`
    scheduleEditor.weekGroups = sanitizeGroupLabels([...scheduleEditor.weekGroups, nextLabel], 'Week 1')
  } else {
    const nextLabel = `Day ${scheduleEditor.dayGroups.length + 1}`
    scheduleEditor.dayGroups = sanitizeGroupLabels([...scheduleEditor.dayGroups, nextLabel], 'Any Day')
  }
  ensureEditorExerciseGroups()
}

const removeScheduleGroup = (index) => {
  if (scheduleEditor.scheduleMode === 'week') {
    if (scheduleEditor.weekGroups.length <= 1) return
    scheduleEditor.weekGroups.splice(index, 1)
    scheduleEditor.weekGroups = sanitizeGroupLabels(scheduleEditor.weekGroups, 'Week 1')
  } else {
    if (scheduleEditor.dayGroups.length <= 1) return
    scheduleEditor.dayGroups.splice(index, 1)
    scheduleEditor.dayGroups = sanitizeGroupLabels(scheduleEditor.dayGroups, 'Any Day')
  }
  ensureEditorExerciseGroups()
}

const removeEditorExercise = (index) => {
  scheduleEditor.exercises.splice(index, 1)
}

const saveScheduleEditor = async () => {
  const targetPlanId = String(scheduleEditor.planId || '').trim()
  if (!targetPlanId) {
    errorMsg.value = 'No global workout plan selected for schedule editing.'
    return
  }

  if (!Array.isArray(scheduleEditor.exercises) || scheduleEditor.exercises.length < 1) {
    errorMsg.value = 'Add at least one exercise before saving this workout.'
    successMsg.value = ''
    return
  }

  scheduleEditor.saving = true
  clearMessages()
  try {
    const dayGroups = sanitizeGroupLabels(scheduleEditor.dayGroups, 'Any Day')
    const weekGroups = sanitizeGroupLabels(scheduleEditor.weekGroups, 'Week 1')
    const mode = scheduleEditor.scheduleMode === 'week' ? 'week' : 'day'
    const fallbackGroup = mode === 'week' ? weekGroups[0] : dayGroups[0]

    const planner = {
      planId: targetPlanId,
      scheduleMode: mode,
      dayGroups,
      weekGroups,
      metadata: {
        ...scheduleEditor.metadata,
      },
      exercises: scheduleEditor.exercises.map((exercise) => ({
        ...exercise,
        scheduleGroup: activeScheduleGroups.value.includes(exercise.scheduleGroup)
          ? exercise.scheduleGroup
          : fallbackGroup,
      })),
    }

    const res = await axios.patch(
      `${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(targetPlanId)}/schedule`,
      { planner },
      { withCredentials: true }
    )

    plans.value = Array.isArray(res.data?.workoutLists)
      ? res.data.workoutLists.map(normalizePlan)
      : plans.value

    const savedPlanner = res.data?.planner || planner
    const savedMetadata = savedPlanner?.metadata || scheduleEditor.metadata
    selectedPlan.value = {
      planId: String(savedPlanner?.planId || targetPlanId),
      name: String(savedMetadata?.name || scheduleEditor.planName || '').trim() || 'Untitled Workout',
      description: String(savedMetadata?.description || '').trim(),
      planType: String(savedMetadata?.planType || 'featured').trim() || 'featured',
      estimatedDuration: Number(savedMetadata?.estimatedDuration || 0),
      exerciseCount: Array.isArray(savedPlanner?.exercises) ? savedPlanner.exercises.length : scheduleEditor.exercises.length,
      updatedAt: savedPlanner?.updatedAt || new Date().toISOString(),
    }

    scheduleEditor.planName = selectedPlan.value.name
    successMsg.value = 'Global workout plan schedule updated.'
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to save global workout plan schedule.'
  } finally {
    scheduleEditor.saving = false
  }
}

onMounted(loadPlans)
</script>

<template>
  <div class="app-page-shell admin-global-workout-plans">
    <div class="app-page-canvas app-inner-shell admin-global-workout-plans__canvas">
    <section class="ff-page-header app-header-gradient admin-global-workout-plans__hero mb-20">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <h2 class="mb-0">Global Workout Plans</h2>
        <small class="admin-global-workout-plans__hero-subtitle">Administrator workspace for global Featured and Community Shared plans.</small>
      </div>
      <button type="button" class="btn btn-primary admin-primary-btn" @click="resetForm">New Plan</button>
      </div>
    </section>

    <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <div class="panel-bg admin-panel admin-panel--form mb-20">
      <div class="row g-3 align-items-end">
        <div class="col-md-4">
          <label class="form-label">Plan Name</label>
          <input v-model="form.name" class="form-control" placeholder="e.g., Summer Strength Foundation" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Workout Plan Type</label>
          <select v-model="form.planType" class="form-select">
            <option value="featured">Featured</option>
            <option value="community_shared">Community Shared</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Estimated Duration</label>
          <input v-model.number="form.estimatedDuration" class="form-control" type="number" min="0" />
        </div>
        <div class="col-md-3 d-flex justify-content-end">
          <button type="button" class="btn btn-primary admin-primary-btn" :disabled="saving" @click="savePlan">
            <i v-if="saving" class="fa-solid fa-spinner fa-spin me-2"></i>
            {{ isEditing ? 'Update Plan' : 'Create Plan' }}
          </button>
        </div>
      </div>

      <div class="mt-3">
        <label class="form-label">Description</label>
        <textarea v-model="form.description" class="form-control" rows="3" placeholder="Plan summary and intended audience"></textarea>
      </div>
    </div>

    <div class="panel-bg admin-panel admin-panel--table mobile-table">
      <div v-if="loading" class="p-3 text-muted">Loading global workout plans...</div>
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 admin-table">
          <thead>
            <tr>
              <th>Plan Name</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Exercises</th>
              <th>Updated</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in plans" :key="plan.planId">
              <td data-label="Plan Name" class="fw-semibold admin-table__value admin-table__value--name">{{ plan.name }}</td>
              <td data-label="Type">
                <span class="badge plan-type-badge" :class="plan.planType === 'community_shared' ? 'plan-type-badge--community' : 'plan-type-badge--featured'">
                  {{ planTypeLabel(plan.planType) }}
                </span>
              </td>
              <td data-label="Duration" class="admin-table__value">{{ plan.estimatedDuration }} min</td>
              <td data-label="Exercises" class="admin-table__value">{{ plan.exerciseCount }}</td>
              <td data-label="Updated" class="admin-table__value">{{ formatDate(plan.updatedAt) }}</td>
              <td data-label="Actions" class="text-end">
                <div class="d-flex gap-2 justify-content-end flex-wrap">
                  <button type="button" class="btn btn-sm btn-outline-info" @click="viewPlan(plan.planId)">View</button>
                  <button type="button" class="btn btn-sm btn-outline-primary" @click="editPlan(plan)">Edit</button>
                  <button type="button" class="btn btn-sm admin-action-btn" @click="openInWorkoutBuilder(plan)">Edit Schedule</button>
                  <button type="button" class="btn btn-sm btn-outline-danger" :disabled="deletingId === plan.planId" @click="deletePlan(plan)">
                    <i v-if="deletingId === plan.planId" class="fa-solid fa-spinner fa-spin me-1"></i>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!plans.length">
              <td colspan="6" class="text-center text-muted py-4">No global workout plans found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="selectedPlan" class="panel-bg admin-panel mt-20">
      <div class="d-flex justify-content-between align-items-center mb-12">
        <h4 class="mb-0">Plan Details</h4>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="openInWorkoutBuilder(selectedPlan)">Open Schedule Builder</button>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Plan Name</label>
          <div class="details-value">{{ selectedPlan.name }}</div>
        </div>
        <div class="col-md-3">
          <label class="form-label">Workout Plan Type</label>
          <div class="details-value">{{ planTypeLabel(selectedPlan.planType) }}</div>
        </div>
        <div class="col-md-3">
          <label class="form-label">Estimated Duration</label>
          <div class="details-value">{{ selectedPlan.estimatedDuration }} min</div>
        </div>
        <div class="col-12">
          <label class="form-label">Description</label>
          <div class="details-value">{{ selectedPlan.description || '—' }}</div>
        </div>
      </div>
    </div>

    <div v-if="scheduleEditor.open" class="panel-bg admin-panel mt-20">
      <div class="d-flex justify-content-between align-items-center mb-12">
        <h4 class="mb-0">Edit Global Plan Schedule: {{ scheduleEditor.planName }}</h4>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="scheduleEditor.open = false">Close Editor</button>
      </div>

      <div v-if="scheduleEditor.loading" class="p-3 text-muted">Loading schedule editor...</div>

      <div v-else class="schedule-editor-grid">
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label">Schedule Mode</label>
            <select v-model="scheduleEditor.scheduleMode" class="form-select" @change="ensureEditorExerciseGroups">
              <option value="day">By Day</option>
              <option value="week">By Week</option>
            </select>
          </div>
          <div class="col-md-8">
            <div class="d-flex justify-content-end">
              <button type="button" class="btn btn-sm admin-action-btn" @click="addScheduleGroup">Add Group</button>
            </div>
          </div>
        </div>

        <div class="schedule-group-editor mt-3">
          <label class="form-label">{{ scheduleEditor.scheduleMode === 'week' ? 'Week Groups' : 'Day Groups' }}</label>
          <div class="schedule-group-editor__list">
            <div v-for="(group, index) in activeScheduleGroups" :key="`${group}-${index}`" class="schedule-group-editor__item">
              <input
                v-if="scheduleEditor.scheduleMode === 'week'"
                v-model="scheduleEditor.weekGroups[index]"
                class="form-control form-control-sm"
                @blur="scheduleEditor.weekGroups = sanitizeGroupLabels(scheduleEditor.weekGroups, 'Week 1'); ensureEditorExerciseGroups()"
              />
              <input
                v-else
                v-model="scheduleEditor.dayGroups[index]"
                class="form-control form-control-sm"
                @blur="scheduleEditor.dayGroups = sanitizeGroupLabels(scheduleEditor.dayGroups, 'Any Day'); ensureEditorExerciseGroups()"
              />
              <button type="button" class="btn btn-sm btn-outline-danger" @click="removeScheduleGroup(index)">Remove</button>
            </div>
          </div>
        </div>

        <div class="table-responsive mt-3">
          <table class="table align-middle mb-0 admin-table admin-table--editor">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Group</th>
                <th>Sets</th>
                <th>Reps</th>
                <th>Duration</th>
                <th>Rest</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(exercise, index) in scheduleEditor.exercises" :key="exercise.id || index">
                <td class="admin-table__value">{{ exercise.name || 'Untitled Exercise' }}</td>
                <td>
                  <select v-model="exercise.scheduleGroup" class="form-select form-select-sm">
                    <option v-for="group in activeScheduleGroups" :key="group" :value="group">{{ group }}</option>
                  </select>
                </td>
                <td><input v-model.number="exercise.sets" type="number" min="0" class="form-control form-control-sm" /></td>
                <td><input v-model.number="exercise.reps" type="number" min="0" class="form-control form-control-sm" /></td>
                <td><input v-model.number="exercise.duration" type="number" min="0" class="form-control form-control-sm" /></td>
                <td><input v-model.number="exercise.restTime" type="number" min="0" class="form-control form-control-sm" /></td>
                <td>
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeEditorExercise(index)">Remove</button>
                </td>
              </tr>
              <tr v-if="!scheduleEditor.exercises.length">
                <td colspan="7" class="text-center text-muted py-4">No exercises in this global plan schedule.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-end mt-3">
          <button type="button" class="btn btn-primary admin-primary-btn" :disabled="scheduleEditor.saving" @click="saveScheduleEditor">
            <i v-if="scheduleEditor.saving" class="fa-solid fa-spinner fa-spin me-2"></i>
            Save Global Schedule
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.admin-global-workout-plans {
  --agwp-surface: #18263f;
  --agwp-surface-2: #1f3152;
  --agwp-surface-soft: #243a5f;
  --agwp-border: rgba(139, 183, 255, 0.26);
  --agwp-border-strong: rgba(139, 183, 255, 0.45);
  --agwp-text: #f3f8ff;
  --agwp-text-muted: #bdd2ef;
  --agwp-input: #213457;
  --agwp-accent: #2563eb;
}

.admin-global-workout-plans__canvas {
  width: min(1200px, 100%);
  margin: 0 auto;
}

.admin-global-workout-plans__hero {
  border: 1px solid var(--agwp-border);
  border-radius: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #0f2561 0%, #112463 42%, #1b2444 100%) !important;
  box-shadow: 0 16px 30px rgba(9, 16, 34, 0.3);
}

.admin-global-workout-plans__hero h2 {
  color: #f8fbff;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.admin-global-workout-plans__hero-subtitle {
  color: #cde0f8;
}

.admin-panel {
  border: 1px solid var(--agwp-border);
  border-radius: 14px;
  padding: 18px;
  background: linear-gradient(180deg, var(--agwp-surface) 0%, var(--agwp-surface-2) 100%);
  box-shadow: 0 12px 24px rgba(7, 12, 28, 0.26);
}

.admin-panel--table {
  overflow: hidden;
}

.admin-global-workout-plans .form-label {
  color: var(--agwp-text-muted);
  font-weight: 600;
}

.admin-global-workout-plans .form-control,
.admin-global-workout-plans .form-select {
  background: var(--agwp-input);
  border: 1px solid var(--agwp-border);
  color: var(--agwp-text);
}

.admin-global-workout-plans .form-control::placeholder {
  color: rgba(223, 236, 255, 0.7);
}

.admin-global-workout-plans .form-control:focus,
.admin-global-workout-plans .form-select:focus {
  background: color-mix(in srgb, var(--agwp-input) 86%, #32558c 14%);
  color: var(--agwp-text);
  border-color: var(--agwp-border-strong);
  box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
}

.admin-global-workout-plans .form-select option {
  background: #1a2e4e;
  color: #f3f8ff;
}

.admin-primary-btn {
  background: #2563eb !important;
  background-image: none !important;
  border-color: #2563eb !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.admin-primary-btn:hover,
.admin-primary-btn:focus {
  background: #1d4ed8 !important;
  background-image: none !important;
  border-color: #1d4ed8 !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.admin-primary-btn:disabled {
  background: #31569f !important;
  background-image: none !important;
  border-color: #31569f !important;
  color: #d6e2f5 !important;
  box-shadow: none !important;
}

.admin-table thead th {
  color: #dbe7f7;
  border-bottom-color: var(--agwp-border);
  font-size: 0.77rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.admin-table td {
  color: var(--agwp-text);
  border-color: color-mix(in srgb, var(--agwp-border) 70%, transparent 30%);
}

.admin-table__value {
  color: #e9f2ff !important;
  font-weight: 600;
}

.admin-table__value--name {
  color: #f5f9ff !important;
}

.plan-type-badge {
  color: #f8fbff;
  border: 1px solid rgba(255, 255, 255, 0.24);
}

.plan-type-badge--featured {
  background: rgba(37, 99, 235, 0.25);
}

.plan-type-badge--community {
  background: rgba(56, 189, 248, 0.2);
}

.admin-action-btn {
  background: #2563eb !important;
  color: #ffffff !important;
  border: 1px solid #2563eb !important;
  box-shadow: none !important;
}

.admin-action-btn:hover,
.admin-action-btn:focus {
  background: #1d4ed8 !important;
  color: #ffffff !important;
  border-color: #1d4ed8 !important;
}

.schedule-editor-grid {
  display: grid;
}

.schedule-group-editor__list {
  display: grid;
  gap: 8px;
}

.schedule-group-editor__item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.admin-table--editor td {
  color: #e9f2ff;
}

.admin-global-workout-plans .text-muted {
  color: #bad0ea !important;
}

.admin-global-workout-plans .badge {
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.details-value {
  min-height: 42px;
  border: 1px solid var(--agwp-border);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--agwp-input);
  color: var(--agwp-text);
}

.panel-bg {
  border: 1px solid var(--agwp-border);
  border-radius: 14px;
  padding: 18px;
}

.mb-12 {
  margin-bottom: 12px;
}

.mt-20 {
  margin-top: 20px;
}

.table td,
.table th {
  vertical-align: middle;
}

@media (max-width: 767px) {
  .admin-global-workout-plans__hero {
    padding: 16px;
  }

  .admin-global-workout-plans__hero h2 {
    font-size: 1.2rem;
  }

  .panel-bg {
    padding: 14px;
  }

  .admin-panel--form .row > [class*='col-'],
  .admin-panel--form .row > [class*='col-md-'] {
    width: 100%;
    max-width: 100%;
    flex: 1 1 100%;
  }

  .admin-panel--form .col-md-3.d-flex.justify-content-end {
    justify-content: stretch !important;
  }

  .admin-panel--form .admin-primary-btn {
    width: 100%;
  }

  .details-value {
    font-size: 0.92rem;
  }
}
</style>
