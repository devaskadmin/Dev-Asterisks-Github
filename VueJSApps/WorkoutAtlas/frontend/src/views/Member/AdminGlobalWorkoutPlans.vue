<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { API_BASE } from '@/config/env'
import ExercisePickerModal from '@/components/workout-builder/ExercisePickerModal.vue'

const loading = ref(false)
const saving = ref(false)
const deletingId = ref('')
const builderVisible = ref(false)
const plans = ref([])
const errorMsg = ref('')
const successMsg = ref('')

const exercisePickerOpen = ref(false)
const exerciseLibrary = ref([])
const exerciseLibraryLoading = ref(false)
const currentUserId = ref(null)
const pickerTargetDayId = ref('')
const CATEGORY_OPTIONS = ['Weight Loss', 'Strength', 'Muscle Building', 'Cardio', 'General Fitness', 'Beginner']
const ACCESS_OPTIONS = ['Free', 'Premium']
const CATEGORY_ALIASES = {
  'weight loss': 'Weight Loss',
  strength: 'Strength',
  'muscle building': 'Muscle Building',
  cardio: 'Cardio',
  'general fitness': 'General Fitness',
  beginner: 'Beginner',
  featured: 'General Fitness',
  community_shared: 'General Fitness',
  'community shared': 'General Fitness',
}

const normalizeCategory = (value) => {
  const raw = String(value || '').trim()
  if (CATEGORY_OPTIONS.includes(raw)) {
    return raw
  }

  const mapped = CATEGORY_ALIASES[raw.toLowerCase()]
  if (mapped && CATEGORY_OPTIONS.includes(mapped)) {
    return mapped
  }

  return CATEGORY_OPTIONS[0]
}

const DEFAULT_DAY_LABELS = ['Monday', 'Wednesday', 'Friday']
const DAY_PRESET_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const CUSTOM_DAY_OPTION_VALUE = '__custom__'

const createDayLabel = (index) => `DAY ${index + 1}`
const createDay = (index = 0, label = '') => ({
  id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: String(label || createDayLabel(index)).trim(),
  exercises: [],
})

const createInitialDays = () => DEFAULT_DAY_LABELS.map((label, index) => createDay(index, label))

const getNextDayDefaultLabel = () => {
  const usedLabels = new Set(
    builder.days
      .map((day) => String(day?.label || '').trim().toLowerCase())
      .filter(Boolean)
  )
  const nextPreset = DAY_PRESET_OPTIONS.find((label) => !usedLabels.has(label.toLowerCase()))
  if (nextPreset) {
    return nextPreset
  }
  return createDayLabel(builder.days.length)
}

const isPresetDayLabel = (label) => {
  const value = String(label || '').trim().toLowerCase()
  return DAY_PRESET_OPTIONS.some((item) => item.toLowerCase() === value)
}

const handleDayPresetSelect = (dayId, value) => {
  const day = builder.days.find((item) => item.id === dayId)
  if (!day) return
  if (value === CUSTOM_DAY_OPTION_VALUE) {
    return
  }
  day.label = String(value || '').trim() || day.label
}

const builder = reactive({
  planId: '',
  planType: 'featured',
  category: normalizeCategory(''),
  name: '',
  description: '',
  estimatedDuration: 0,
  access: 'Free',
  days: createInitialDays(),
})

const isEditing = computed(() => Boolean(String(builder.planId || '').trim()))

const clearMessages = () => {
  errorMsg.value = ''
  successMsg.value = ''
}

const normalizePlan = (plan = {}) => ({
  planId: String(plan.planId || '').trim(),
  name: String(plan.name || '').trim() || 'Untitled Workout',
  category: normalizeCategory(plan.type),
  description: String(plan.description || '').trim(),
  planType: String(plan.planType || 'featured').trim() || 'featured',
  estimatedDuration: Number(plan.estimatedDuration || 0),
  dayCount: Number(plan.dayCount || 0),
  updatedAt: plan.updatedAt || null,
  exerciseCount: Number(plan.exerciseCount || 0),
  visibility: String(plan.visibility || 'private').trim() || 'private',
})

const formatAccess = (plan = {}) => {
  const visibility = String(plan?.visibility || '').trim().toLowerCase()
  if (visibility === 'private' || visibility === 'unlisted') {
    return 'Premium'
  }
  return 'Free'
}

const normalizeBuilderAccess = (value) => {
  const visibility = String(value || '').trim().toLowerCase()
  if (visibility === 'private' || visibility === 'unlisted' || visibility === 'premium') {
    return 'Premium'
  }
  return 'Free'
}

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString()
}

const normalizeExerciseRecordingType = (exercise = {}) => {
  const workoutType = String(exercise?.workoutType || '').trim().toLowerCase()
  if (workoutType === 'cardio') return 'cardio'
  if (workoutType === 'strength' || !workoutType) return 'strength'
  return 'other'
}

const isStrengthExercise = (exercise = {}) => normalizeExerciseRecordingType(exercise) === 'strength'
const supportsDistance = (exercise = {}) => {
  const recordingType = normalizeExerciseRecordingType(exercise)
  return recordingType === 'cardio' || recordingType === 'other'
}

const normalizeExerciseFromPlanner = (exercise = {}) => ({
  id: String(exercise?.id || `wse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  exerciseId: Number(exercise?.exerciseId || 0),
  name: String(exercise?.name || '').trim() || 'Untitled Exercise',
  image: String(exercise?.image || '').trim(),
  workoutType: String(exercise?.workoutType || 'Strength').trim() || 'Strength',
  muscleGroup: String(exercise?.muscleGroup || '').trim(),
  equipment: String(exercise?.equipment || '').trim(),
  sets: Number(exercise?.sets || 0),
  reps: Number(exercise?.reps || 0),
  weight: Number(exercise?.weight || 0),
  duration: Number(exercise?.duration || 0),
  distance: Number(exercise?.distance || 0),
  restTime: Number(exercise?.restTime || 0),
  notes: String(exercise?.notes || '').trim(),
})

const normalizeExerciseFromPicker = (exercise = {}) => ({
  id: `picker-${Number(exercise?.ExerciseID || 0)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  exerciseId: Number(exercise?.ExerciseID || 0),
  name: String(exercise?.ExerciseTitle || '').trim(),
  image: String(exercise?.image || '').trim(),
  workoutType: String(exercise?.WorkoutType || 'Strength').trim() || 'Strength',
  muscleGroup: String(exercise?.MuscleGroup || '').trim(),
  equipment: String(exercise?.Equipment || '').trim(),
  sets: 0,
  reps: 0,
  weight: 0,
  duration: 0,
  distance: 0,
  restTime: 0,
  notes: '',
})

const recalculateDayLabels = () => {
  builder.days = builder.days.map((day, index) => ({
    ...day,
    label: String(day?.label || '').trim() || createDayLabel(index),
  }))
}

const resetBuilder = () => {
  builder.planId = ''
  builder.planType = 'featured'
  builder.category = normalizeCategory('')
  builder.name = ''
  builder.description = ''
  builder.estimatedDuration = 0
  builder.access = 'Free'
  builder.days = createInitialDays()
  pickerTargetDayId.value = ''
  clearMessages()
}

const startAddPlan = () => {
  resetBuilder()
  builderVisible.value = true
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
    if (status === 404 || apiError.includes('no global workout plans')) {
      plans.value = []
      return
    }
    errorMsg.value = err.response?.data?.error || 'Failed to load global workout plans.'
  } finally {
    loading.value = false
  }
}

const loadExerciseLibrary = async () => {
  if (exerciseLibraryLoading.value || exerciseLibrary.value.length) {
    return
  }

  exerciseLibraryLoading.value = true
  try {
    const [exerciseRes, sessionRes] = await Promise.all([
      axios.get(`${API_BASE}/api/exercises?view=all`, { withCredentials: true }),
      axios.get(`${API_BASE}/api/session`, { withCredentials: true }),
    ])

    exerciseLibrary.value = Array.isArray(exerciseRes.data) ? exerciseRes.data : []
    currentUserId.value = Number(sessionRes?.data?.user?.id || 0) || null
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to load exercise library.'
  } finally {
    exerciseLibraryLoading.value = false
  }
}

const loadPlanIntoBuilder = async (planId) => {
  const targetId = String(planId || '').trim()
  if (!targetId) return

  saving.value = true
  clearMessages()
  try {
    const res = await axios.get(`${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(targetId)}`, {
      withCredentials: true,
    })

    const planner = res.data?.planner || {}
    const metadata = planner?.metadata || {}

    const dayGroups = Array.isArray(planner?.dayGroups)
      ? planner.dayGroups.map((group) => String(group || '').trim()).filter(Boolean)
      : []

    const effectiveGroups = dayGroups.length ? dayGroups : ['Day 1']
    const dayMap = new Map()
    for (const [index, groupLabel] of effectiveGroups.entries()) {
      dayMap.set(groupLabel, {
        id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
        label: groupLabel,
        exercises: [],
      })
    }

    const plannerExercises = Array.isArray(planner?.exercises) ? planner.exercises : []
    for (const rawExercise of plannerExercises) {
      const normalized = normalizeExerciseFromPlanner(rawExercise)
      const targetLabel = String(rawExercise?.scheduleGroup || effectiveGroups[0] || 'Day 1').trim() || 'Day 1'
      if (!dayMap.has(targetLabel)) {
        dayMap.set(targetLabel, {
          id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${dayMap.size}`,
          label: targetLabel,
          exercises: [],
        })
      }
      dayMap.get(targetLabel)?.exercises.push(normalized)
    }

    builder.planId = targetId
    builder.planType = String(metadata?.planType || 'featured').trim() || 'featured'
    builder.category = normalizeCategory(metadata?.type)
    builder.name = String(metadata?.name || '').trim()
    builder.description = String(metadata?.description || '').trim()
    builder.estimatedDuration = Math.max(0, Number(metadata?.estimatedDuration || 0))
    builder.access = normalizeBuilderAccess(planner?.visibility)
    builder.days = Array.from(dayMap.values())
    recalculateDayLabels()

    successMsg.value = `Loaded ${builder.name || 'global workout'} for editing.`
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to load global workout plan.'
  } finally {
    saving.value = false
  }
}

const addDay = () => {
  builder.days.push(createDay(builder.days.length, getNextDayDefaultLabel()))
  recalculateDayLabels()
}

const removeDay = (dayId) => {
  if (builder.days.length <= 1) {
    return
  }

  const index = builder.days.findIndex((day) => day.id === dayId)
  if (index < 0) return

  const targetDay = builder.days[index]
  if (Array.isArray(targetDay?.exercises) && targetDay.exercises.length > 0) {
    const confirmed = window.confirm('This day has exercises. Remove the day and all exercises in it?')
    if (!confirmed) return
  }

  builder.days.splice(index, 1)
  recalculateDayLabels()
}

const removeExercise = (dayId, exerciseIndex) => {
  const day = builder.days.find((item) => item.id === dayId)
  if (!day || !Array.isArray(day.exercises)) return
  day.exercises.splice(exerciseIndex, 1)
}

const moveExercise = (dayId, exerciseIndex, direction) => {
  const day = builder.days.find((item) => item.id === dayId)
  if (!day || !Array.isArray(day.exercises)) return

  const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1
  if (targetIndex < 0 || targetIndex >= day.exercises.length) {
    return
  }

  const reordered = [...day.exercises]
  const [item] = reordered.splice(exerciseIndex, 1)
  reordered.splice(targetIndex, 0, item)
  day.exercises = reordered
}

const openExercisePickerForDay = async (dayId) => {
  const day = builder.days.find((item) => item.id === dayId)
  if (!day) return

  clearMessages()
  await loadExerciseLibrary()
  if (!exerciseLibrary.value.length) {
    errorMsg.value = 'No exercises available to add right now.'
    return
  }

  pickerTargetDayId.value = dayId
  exercisePickerOpen.value = true
}

const handleAddExercisesFromPicker = (incomingExercises) => {
  const targetDayId = String(pickerTargetDayId.value || '').trim()
  const targetDay = builder.days.find((day) => day.id === targetDayId)
  if (!targetDay) {
    exercisePickerOpen.value = false
    pickerTargetDayId.value = ''
    return
  }

  const exercises = Array.isArray(incomingExercises) ? incomingExercises : [incomingExercises]
  const validExercises = exercises.filter((exercise) => Number(exercise?.ExerciseID || 0) > 0)
  if (!validExercises.length) {
    exercisePickerOpen.value = false
    pickerTargetDayId.value = ''
    return
  }

  targetDay.exercises.push(...validExercises.map((exercise) => normalizeExerciseFromPicker(exercise)))
  exercisePickerOpen.value = false
  pickerTargetDayId.value = ''
  successMsg.value = validExercises.length > 1
    ? `${validExercises.length} exercises added to ${targetDay.label}.`
    : `Exercise added to ${targetDay.label}.`
}

const validateBuilder = () => {
  const missing = []
  if (!String(builder.category || '').trim()) missing.push('category')
  if (!String(builder.name || '').trim()) missing.push('plan name')
  const normalizedDays = builder.days
    .map((day) => String(day?.label || '').trim())
    .filter(Boolean)
  if (!normalizedDays.length) missing.push('at least one workout day')

  const exerciseCount = builder.days.reduce((total, day) => {
    return total + (Array.isArray(day?.exercises) ? day.exercises.length : 0)
  }, 0)
  if (exerciseCount < 1) missing.push('at least one exercise')

  if (missing.length) {
    return {
      ok: false,
      message: `This global starter workout is incomplete. Missing: ${missing.join(', ')}.`,
    }
  }

  return { ok: true }
}

const ensureDraftPlanId = async () => {
  if (String(builder.planId || '').trim()) {
    return builder.planId
  }

  const createRes = await axios.post(
    `${API_BASE}/api/admin/global-workout-plans`,
    {
      title: builder.name,
      description: builder.description,
      planType: builder.planType,
      estimatedDurationMinutes: Math.max(0, Number(builder.estimatedDuration || 0)),
      accessLevel: String(builder.access || 'Free').trim(),
    },
    { withCredentials: true }
  )

  const newPlanId = String(createRes.data?.planner?.planId || '').trim()
  if (!newPlanId) {
    throw new Error('Could not create global workout plan draft.')
  }

  builder.planId = newPlanId

  if (Array.isArray(createRes.data?.workoutLists)) {
    plans.value = createRes.data.workoutLists.map(normalizePlan)
  }

  return newPlanId
}

const saveGlobalWorkout = async () => {
  clearMessages()

  const validation = validateBuilder()
  if (!validation.ok) {
    errorMsg.value = validation.message
    return
  }

  saving.value = true
  try {
    const planId = await ensureDraftPlanId()
    const dayGroups = builder.days.map((day, index) => String(day?.label || '').trim() || createDayLabel(index))

    const exercises = []
    for (const day of builder.days) {
      const dayLabel = String(day?.label || '').trim()
      const dayExercises = Array.isArray(day?.exercises) ? day.exercises : []
      for (const exercise of dayExercises) {
        exercises.push({
          id: exercise.id,
          exerciseId: Number(exercise.exerciseId || 0),
          name: String(exercise.name || '').trim(),
          image: String(exercise.image || '').trim(),
          workoutType: String(exercise.workoutType || 'Strength').trim() || 'Strength',
          muscleGroup: String(exercise.muscleGroup || '').trim(),
          equipment: String(exercise.equipment || '').trim(),
          sets: Number(exercise.sets || 0),
          reps: Number(exercise.reps || 0),
          weight: Number(exercise.weight || 0),
          duration: Number(exercise.duration || 0),
          distance: Number(exercise.distance || 0),
          restTime: Number(exercise.restTime || 0),
          notes: String(exercise.notes || '').trim(),
          scheduleGroup: dayLabel,
        })
      }
    }

    const plannerPayload = {
      planId,
      scheduleMode: 'day',
      dayGroups,
      weekGroups: ['Week 1'],
      metadata: {
        name: String(builder.name || '').trim(),
        description: String(builder.description || '').trim(),
        type: normalizeCategory(builder.category),
        planType: builder.planType,
        estimatedDuration: Math.max(0, Number(builder.estimatedDuration || 0)),
        accessLevel: String(builder.access || 'Free').trim(),
      },
      exercises,
    }

    const saveRes = await axios.patch(
      `${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(planId)}/schedule`,
      { planner: plannerPayload },
      { withCredentials: true }
    )

    if (Array.isArray(saveRes.data?.workoutLists)) {
      plans.value = saveRes.data.workoutLists.map(normalizePlan)
    } else {
      await loadPlans()
    }

    successMsg.value = 'Global workout saved.'
    await loadPlanIntoBuilder(planId)
  } catch (err) {
    errorMsg.value = err.response?.data?.error || err.message || 'Failed to save global workout.'
  } finally {
    saving.value = false
  }
}

const deletePlan = async (plan) => {
  const targetId = String(plan?.planId || '').trim()
  if (!targetId) return

  const confirmed = window.confirm(`Delete ${plan?.name || 'this plan'}?`)
  if (!confirmed) return

  deletingId.value = targetId
  clearMessages()
  try {
    const res = await axios.delete(`${API_BASE}/api/admin/global-workout-plans/${encodeURIComponent(targetId)}`, {
      withCredentials: true,
    })

    plans.value = Array.isArray(res.data?.workoutLists)
      ? res.data.workoutLists.map(normalizePlan)
      : plans.value.filter((item) => String(item.planId) !== targetId)

    if (String(builder.planId || '') === targetId) {
      resetBuilder()
    }

    successMsg.value = 'Global workout plan deleted.'
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to delete global workout plan.'
  } finally {
    deletingId.value = ''
  }
}

const viewPlan = (plan) => {
  const targetId = String(plan?.planId || '').trim()
  if (!targetId) return
  builderVisible.value = true
  void loadPlanIntoBuilder(targetId)
}

const editPlan = (plan) => {
  const targetId = String(plan?.planId || '').trim()
  if (!targetId) return
  builderVisible.value = true
  void loadPlanIntoBuilder(targetId)
}

onMounted(loadPlans)
</script>

<template>
  <div class="app-page-shell admin-global-workout-plans">
    <div class="app-page-canvas app-inner-shell admin-global-workout-plans__canvas">
      <section class="ff-page-header app-header-gradient admin-global-workout-plans__hero mb-20">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 class="mb-0">GLOBAL WORKOUT PLANS</h2>
            <small class="admin-global-workout-plans__hero-subtitle">Starter plans created by admins and trainers for members who do not want to build their own workouts.</small>
          </div>
          <button type="button" class="btn btn-primary admin-primary-btn" @click="startAddPlan">+ Add Plan</button>
        </div>
      </section>

      <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
      <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

      <div class="global-builder-layout">
        <section class="panel-bg admin-panel admin-panel--table mobile-table">
          <h4 class="mb-12">Global Workout Plans</h4>
          <div v-if="loading" class="p-3 text-muted">Loading global workout plans...</div>
          <div v-else class="table-responsive">
            <table class="table align-middle mb-0 admin-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Category</th>
                  <th>Days</th>
                  <th>Exercises</th>
                  <th>Access</th>
                  <th>Updated</th>
                  <th class="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="plan in plans" :key="plan.planId">
                  <td class="fw-semibold admin-table__value admin-table__value--name">{{ plan.name }}</td>
                  <td class="admin-table__value">{{ plan.category }}</td>
                  <td class="admin-table__value">{{ plan.dayCount }}</td>
                  <td class="admin-table__value">{{ plan.exerciseCount }}</td>
                  <td class="admin-table__value">{{ formatAccess(plan) }}</td>
                  <td class="admin-table__value">{{ formatDate(plan.updatedAt) }}</td>
                  <td class="text-end">
                    <div class="d-flex gap-2 justify-content-end flex-wrap">
                      <button type="button" class="btn btn-sm btn-outline-info" :disabled="saving" @click="viewPlan(plan)">View</button>
                      <button type="button" class="btn btn-sm btn-outline-primary" :disabled="saving" @click="editPlan(plan)">Edit</button>
                      <button type="button" class="btn btn-sm btn-outline-danger" :disabled="deletingId === plan.planId" @click="deletePlan(plan)">
                        <i v-if="deletingId === plan.planId" class="fa-solid fa-spinner fa-spin me-1"></i>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!plans.length">
                  <td colspan="7" class="text-center text-muted py-4">No global workout plans found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="builderVisible" class="panel-bg admin-panel">
          <div class="d-flex justify-content-between align-items-center mb-12">
            <h4 class="mb-0">Global Workout Builder</h4>
            <div class="d-flex align-items-center gap-2">
              <span class="builder-mode-badge">{{ isEditing ? 'Editing Existing Plan' : 'New Plan' }}</span>
              <button type="button" class="btn btn-sm btn-outline-light" :disabled="saving" @click="builderVisible = false">Close</button>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Category</label>
              <select v-model="builder.category" class="form-select">
                <option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
            <div class="col-md-8">
              <label class="form-label">Plan Name</label>
              <input v-model="builder.name" class="form-control" placeholder="e.g., Lose 10 Pounds" />
            </div>
            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea v-model="builder.description" class="form-control" rows="3" placeholder="Plan summary and intended audience"></textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label">Estimated Duration (minutes)</label>
              <input v-model.number="builder.estimatedDuration" type="number" min="0" class="form-control" placeholder="e.g., 45" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Free / Premium</label>
              <select v-model="builder.access" class="form-select">
                <option v-for="option in ACCESS_OPTIONS" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <div class="builder-days mt-20">
            <div class="d-flex justify-content-start align-items-center mb-12">
              <h5 class="mb-0">Workout Days</h5>
            </div>

            <article v-for="day in builder.days" :key="day.id" class="day-card">
              <div class="day-card__head">
                <div class="day-card__title-wrap">
                  <label class="form-label mb-1">Day</label>
                  <select
                    class="form-select form-select-sm mb-2"
                    :value="isPresetDayLabel(day.label) ? day.label : CUSTOM_DAY_OPTION_VALUE"
                    @change="handleDayPresetSelect(day.id, $event.target.value)"
                  >
                    <option v-for="option in DAY_PRESET_OPTIONS" :key="option" :value="option">{{ option }}</option>
                    <option :value="CUSTOM_DAY_OPTION_VALUE">Custom</option>
                  </select>
                  <input v-model="day.label" class="form-control form-control-sm day-card__label" placeholder="MONDAY" />
                </div>
                <div class="day-card__actions">
                  <button type="button" class="btn btn-sm btn-outline-danger" :disabled="builder.days.length <= 1" @click="removeDay(day.id)">Remove Day</button>
                </div>
              </div>

              <div v-if="!day.exercises.length" class="day-empty-state mt-2">No exercises yet</div>

              <div v-else class="table-responsive mt-2">
                <table class="table align-middle mb-0 admin-table admin-table--editor">
                  <thead>
                    <tr>
                      <th>Exercise</th>
                      <th>Sets</th>
                      <th>Reps</th>
                      <th>Weight</th>
                      <th>Time</th>
                      <th>Distance</th>
                      <th>Rest</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(exercise, exerciseIndex) in day.exercises" :key="exercise.id || exerciseIndex">
                      <td>
                        <div class="admin-table__value">{{ exercise.name || 'Untitled Exercise' }}</div>
                        <small class="text-muted">{{ exercise.workoutType || 'General' }}</small>
                      </td>
                      <td>
                        <input v-model.number="exercise.sets" type="number" min="0" class="form-control form-control-sm" :disabled="!isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.reps" type="number" min="0" class="form-control form-control-sm" :disabled="!isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.weight" type="number" min="0" class="form-control form-control-sm" :disabled="!isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.duration" type="number" min="0" class="form-control form-control-sm" :disabled="isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.distance" type="number" min="0" step="0.1" class="form-control form-control-sm" :disabled="!supportsDistance(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.restTime" type="number" min="0" class="form-control form-control-sm" />
                      </td>
                      <td>
                        <div class="d-flex flex-column gap-1">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            :disabled="exerciseIndex === 0"
                            @click="moveExercise(day.id, exerciseIndex, 'up')"
                          >
                            Move Up
                          </button>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            :disabled="exerciseIndex === day.exercises.length - 1"
                            @click="moveExercise(day.id, exerciseIndex, 'down')"
                          >
                            Move Down
                          </button>
                          <button type="button" class="btn btn-sm btn-outline-danger" @click="removeExercise(day.id, exerciseIndex)">Remove</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="day-card__footer mt-2">
                <button type="button" class="btn btn-sm admin-action-btn" :disabled="exerciseLibraryLoading" @click="openExercisePickerForDay(day.id)">
                  <i v-if="exerciseLibraryLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
                  + Add Exercise
                </button>
              </div>
            </article>

            <div class="builder-days__add-day mt-2">
              <button type="button" class="btn btn-sm admin-action-btn" @click="addDay">+ Add Day</button>
            </div>
          </div>

          <div class="d-flex justify-content-end mt-3">
            <button type="button" class="btn btn-primary admin-primary-btn" :disabled="saving" @click="saveGlobalWorkout">
              <i v-if="saving" class="fa-solid fa-spinner fa-spin me-2"></i>
              Save Global Plan
            </button>
          </div>
        </section>
      </div>

      <ExercisePickerModal
        :is-open="exercisePickerOpen"
        :exercises="exerciseLibrary"
        :user-id="currentUserId"
        @close="exercisePickerOpen = false"
        @add="handleAddExercisesFromPicker"
      />
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
  width: min(1280px, 100%);
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

.global-builder-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
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
  border-color: #2563eb !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.admin-primary-btn:hover,
.admin-primary-btn:focus {
  background: #1d4ed8 !important;
  border-color: #1d4ed8 !important;
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
  border-color: #1d4ed8 !important;
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

.builder-mode-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--agwp-border);
  background: color-mix(in srgb, var(--agwp-surface-soft) 75%, #10203a 25%);
  color: var(--agwp-text-muted);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.builder-days {
  display: grid;
  gap: 12px;
}

.day-card {
  border: 1px solid var(--agwp-border);
  border-radius: 10px;
  padding: 12px;
  background: color-mix(in srgb, var(--agwp-surface-soft) 75%, #10203a 25%);
}

.day-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.day-card__title-wrap {
  min-width: 220px;
}

.day-card__label {
  max-width: 240px;
  text-transform: uppercase;
}

.day-card__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.day-card__footer {
  display: flex;
  justify-content: flex-start;
}

.builder-days__add-day {
  display: flex;
  justify-content: center;
}

.day-empty-state {
  border: 1px dashed var(--agwp-border);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--agwp-text-muted);
  background: color-mix(in srgb, var(--agwp-surface-soft) 70%, #10203a 30%);
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

.admin-global-workout-plans .text-muted {
  color: #bad0ea !important;
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

  .day-card__head {
    flex-direction: column;
    align-items: stretch;
  }

  .day-card__label {
    max-width: 100%;
  }

  .day-card__actions {
    justify-content: stretch;
  }

  .day-card__actions .btn {
    width: 100%;
  }
}
</style>
