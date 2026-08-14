<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { API_BASE } from '@/config/env'
import ExercisePickerModal from '@/components/workout-builder/ExercisePickerModal.vue'

const loading = ref(false)
const saving = ref(false)
const deletingId = ref('')
const builderVisible = ref(false)
const builderMode = ref('edit')
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
const GOAL_TYPE_OPTIONS = [
  { value: 'none', label: 'No Specific Goal' },
  { value: 'body_weight', label: 'Body Weight' },
  { value: 'exercise_weight', label: 'Exercise Weight' },
]
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

const normalizeGoalType = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'none'
  if (normalized === 'body_weight') return 'body_weight'
  if (normalized === 'exercise_weight') return 'exercise_weight'
  if (['none', 'no_specific_goal', 'no-specific-goal', 'no specific goal'].includes(normalized)) return 'none'
  return 'none'
}

const formatGoalTypeLabel = (value) => {
  const normalized = normalizeGoalType(value)
  const option = GOAL_TYPE_OPTIONS.find((item) => item.value === normalized)
  return option?.label || 'No Specific Goal'
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
  goalType: 'none',
  category: normalizeCategory(''),
  name: '',
  description: '',
  estimatedDuration: 0,
  access: 'Free',
  days: createInitialDays(),
})

const isEditing = computed(() => Boolean(String(builder.planId || '').trim()))
const isReadOnly = computed(() => builderMode.value === 'view')

// Mobile accordion state for the builder
const builderAccordionOpen = reactive({ planInfo: true, days: {} })
const isDayAccordionOpen = (dayId) => builderAccordionOpen.days[dayId] !== false
const togglePlanInfoAccordion = () => { builderAccordionOpen.planInfo = !builderAccordionOpen.planInfo }
const toggleDayAccordion = (dayId) => { builderAccordionOpen.days[dayId] = !isDayAccordionOpen(dayId) }

const clearMessages = () => {
  errorMsg.value = ''
  successMsg.value = ''
}

const normalizePlan = (plan = {}) => ({
  planId: String(plan.planId || '').trim(),
  name: String(plan.name || '').trim() || 'Untitled Workout',
  category: normalizeCategory(plan.type),
  goalType: normalizeGoalType(plan.goalType),
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
  builder.goalType = 'none'
  builder.category = normalizeCategory('')
  builder.name = ''
  builder.description = ''
  builder.estimatedDuration = 0
  builder.access = 'Free'
  builder.days = createInitialDays()
  pickerTargetDayId.value = ''
  builderAccordionOpen.planInfo = true
  clearMessages()
}

const startAddPlan = () => {
  resetBuilder()
  builderMode.value = 'edit'
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
    builder.goalType = normalizeGoalType(metadata?.goalType)
    builder.category = normalizeCategory(metadata?.type)
    builder.name = String(metadata?.name || '').trim()
    builder.description = String(metadata?.description || '').trim()
    builder.estimatedDuration = Math.max(0, Number(metadata?.estimatedDuration || 0))
    builder.access = normalizeBuilderAccess(planner?.visibility)
    builder.days = Array.from(dayMap.values())
    recalculateDayLabels()

    successMsg.value = isReadOnly.value
      ? `Loaded ${builder.name || 'global workout'} in view mode.`
      : `Loaded ${builder.name || 'global workout'} for editing.`
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to load global workout plan.'
  } finally {
    saving.value = false
  }
}

const addDay = () => {
  if (isReadOnly.value) return
  builder.days.push(createDay(builder.days.length, getNextDayDefaultLabel()))
  recalculateDayLabels()
}

const removeDay = (dayId) => {
  if (isReadOnly.value) return
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
  if (isReadOnly.value) return
  const day = builder.days.find((item) => item.id === dayId)
  if (!day || !Array.isArray(day.exercises)) return
  day.exercises.splice(exerciseIndex, 1)
}

const moveExercise = (dayId, exerciseIndex, direction) => {
  if (isReadOnly.value) return
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
  if (isReadOnly.value) return
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
        goalType: builder.goalType,
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
  if (isReadOnly.value) return
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
        goalType: builder.goalType,
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
  builderMode.value = 'view'
  builderVisible.value = true
  void loadPlanIntoBuilder(targetId)
}

const editPlan = (plan) => {
  const targetId = String(plan?.planId || '').trim()
  if (!targetId) return
  builderMode.value = 'edit'
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
                  <th>Goal Type</th>
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
                  <td class="admin-table__value"><span class="admin-table__field-name"><i class="fa-solid fa-tag admin-table__field-icon" aria-hidden="true"></i>Category</span><span class="admin-table__field-value">{{ plan.category }}</span></td>
                  <td class="admin-table__value"><span class="admin-table__field-name"><i class="fa-solid fa-bullseye admin-table__field-icon" aria-hidden="true"></i>Goal Type</span><span class="admin-table__field-value">{{ formatGoalTypeLabel(plan.goalType) }}</span></td>
                  <td class="admin-table__value"><span class="admin-table__field-name"><i class="fa-solid fa-calendar-days admin-table__field-icon" aria-hidden="true"></i>Days</span><span class="admin-table__field-value">{{ plan.dayCount }}</span></td>
                  <td class="admin-table__value"><span class="admin-table__field-name"><i class="fa-solid fa-dumbbell admin-table__field-icon" aria-hidden="true"></i>Exercises</span><span class="admin-table__field-value">{{ plan.exerciseCount }}</span></td>
                  <td class="admin-table__value"><span class="admin-table__field-name"><i class="fa-solid fa-lock-open admin-table__field-icon" aria-hidden="true"></i>Access</span><span class="admin-table__field-value">{{ formatAccess(plan) }}</span></td>
                  <td class="admin-table__value"><span class="admin-table__field-name"><i class="fa-solid fa-clock admin-table__field-icon" aria-hidden="true"></i>Updated</span><span class="admin-table__field-value">{{ formatDate(plan.updatedAt) }}</span></td>
                  <td class="text-end">
                    <div class="d-flex gap-2 justify-content-end flex-wrap">
                      <button type="button" class="btn btn-sm admin-table-btn admin-table-btn--view" :disabled="saving" @click="viewPlan(plan)">
                        <i class="fa-solid fa-eye admin-table-btn__icon" aria-hidden="true"></i>
                        <span class="admin-table-btn__label">View</span>
                      </button>
                      <button type="button" class="btn btn-sm admin-table-btn admin-table-btn--edit" :disabled="saving" @click="editPlan(plan)">
                        <i class="fa-solid fa-pencil admin-table-btn__icon" aria-hidden="true"></i>
                        <span class="admin-table-btn__label">Edit</span>
                      </button>
                      <button type="button" class="btn btn-sm admin-table-btn admin-table-btn--delete" :disabled="deletingId === plan.planId" @click="deletePlan(plan)">
                        <i v-if="deletingId === plan.planId" class="fa-solid fa-spinner fa-spin me-1"></i>
                        <i v-else class="fa-solid fa-trash admin-table-btn__icon" aria-hidden="true"></i>
                        <span class="admin-table-btn__label">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!plans.length">
                  <td colspan="8" class="text-center text-muted py-4">No global workout plans found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="builderVisible" class="panel-bg admin-panel builder-shell">
          <div class="builder-shell__header mb-12">
            <h4 class="mb-0">Global Workout Builder</h4>
            <span class="builder-mode-badge">{{ isReadOnly ? 'View Only' : (isEditing ? 'Editing Existing Plan' : 'New Plan') }}</span>
          </div>

          <section class="builder-section builder-plan-info" :class="{ 'builder-section--open': builderAccordionOpen.planInfo }">
            <div class="builder-accordion-hdr builder-accordion-hdr--plan" @click="togglePlanInfoAccordion"><i class="fa-solid fa-clipboard-list builder-accordion-hdr__icon" aria-hidden="true"></i><span class="builder-accordion-hdr__title">Plan Information</span><i class="fa-solid fa-chevron-down builder-accordion-hdr__chevron" aria-hidden="true"></i></div>
            <header class="builder-section__header">
              <h5 class="mb-0">Plan Information</h5>
            </header>
            <div class="builder-accordion-body">
              <div class="builder-form-grid">
                <div class="builder-field">
                  <label class="form-label">Category</label>
                  <select v-model="builder.category" class="form-select" :disabled="isReadOnly">
                    <option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
                <div class="builder-field">
                  <label class="form-label">Goal Type</label>
                  <select v-model="builder.goalType" class="form-select" :disabled="isReadOnly">
                    <option v-for="option in GOAL_TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="builder-field">
                  <label class="form-label">Plan Name</label>
                  <input v-model="builder.name" class="form-control" :readonly="isReadOnly" placeholder="e.g., Lose 10 Pounds" />
                </div>
                <div class="builder-field builder-field--full">
                  <label class="form-label">Description</label>
                  <textarea v-model="builder.description" class="form-control" rows="3" :readonly="isReadOnly" placeholder="Plan summary and intended audience"></textarea>
                </div>
                <div class="builder-field">
                  <label class="form-label">Duration (minutes)</label>
                  <input v-model.number="builder.estimatedDuration" type="number" min="0" class="form-control" :readonly="isReadOnly" placeholder="e.g., 45" />
                </div>
                <div class="builder-field">
                  <label class="form-label">Free / Premium</label>
                  <select v-model="builder.access" class="form-select" :disabled="isReadOnly">
                    <option v-for="option in ACCESS_OPTIONS" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section class="builder-section builder-days mt-20">
            <header class="builder-section__header">
              <h5 class="mb-0">Workout Days</h5>
            </header>

            <article v-for="(day, dayIndex) in builder.days" :key="day.id" class="day-card" :class="{ 'day-card--open': isDayAccordionOpen(day.id) }">
              <div class="builder-accordion-hdr builder-accordion-hdr--day" @click="toggleDayAccordion(day.id)"><i class="fa-solid fa-calendar-day builder-accordion-hdr__icon" aria-hidden="true"></i><span class="builder-accordion-hdr__title">Day {{ dayIndex + 1 }} — {{ day.label }}</span><button v-if="!isReadOnly" type="button" class="day-accordion-trash" :disabled="builder.days.length <= 1" @click.stop="removeDay(day.id)" aria-label="Remove day"><i class="fa-solid fa-trash" aria-hidden="true"></i></button><i class="fa-solid fa-chevron-down builder-accordion-hdr__chevron" aria-hidden="true"></i></div>
              <div class="day-accordion-body">
              <div class="day-card__head">
                <div class="day-card__title-wrap">
                  <h6 class="day-card__title mb-0">Day {{ dayIndex + 1 }}</h6>
                  <div class="day-card__control mt-2">
                    <label class="form-label mb-1">Day Name</label>
                    <select
                      class="form-select form-select-sm"
                      :disabled="isReadOnly"
                      :value="isPresetDayLabel(day.label) ? day.label : CUSTOM_DAY_OPTION_VALUE"
                      @change="handleDayPresetSelect(day.id, $event.target.value)"
                    >
                      <option v-for="option in DAY_PRESET_OPTIONS" :key="option" :value="option">{{ option }}</option>
                      <option :value="CUSTOM_DAY_OPTION_VALUE">Custom</option>
                    </select>
                    <input
                      v-if="!isPresetDayLabel(day.label)"
                      v-model="day.label"
                      :readonly="isReadOnly"
                      class="form-control form-control-sm day-card__label mt-2"
                      placeholder="Custom day name"
                    />
                  </div>
                </div>
                <div v-if="!isReadOnly" class="day-card__actions">
                  <button type="button" class="btn btn-sm btn-outline-danger" :disabled="builder.days.length <= 1" @click="removeDay(day.id)">Remove Day</button>
                </div>
              </div>

              <div v-if="!day.exercises.length" class="day-empty-state mt-3">
                <p class="mb-1 day-empty-state__title">No exercises added to this day.</p>
                <button v-if="!isReadOnly" type="button" class="btn btn-sm admin-action-btn day-add-exercise-btn" :disabled="exerciseLibraryLoading" @click="openExercisePickerForDay(day.id)"><i v-if="exerciseLibraryLoading" class="fa-solid fa-spinner fa-spin day-add-exercise-btn__icon" aria-hidden="true"></i><i v-else class="fa-solid fa-plus day-add-exercise-btn__icon" aria-hidden="true"></i><span class="day-add-exercise-btn__label">+ Add Exercise</span></button>
              </div>

              <div v-else class="table-responsive mt-3">
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
                        <input v-model.number="exercise.sets" type="number" min="0" class="form-control form-control-sm" :disabled="isReadOnly || !isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.reps" type="number" min="0" class="form-control form-control-sm" :disabled="isReadOnly || !isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.weight" type="number" min="0" class="form-control form-control-sm" :disabled="isReadOnly || !isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.duration" type="number" min="0" class="form-control form-control-sm" :disabled="isReadOnly || isStrengthExercise(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.distance" type="number" min="0" step="0.1" class="form-control form-control-sm" :disabled="isReadOnly || !supportsDistance(exercise)" />
                      </td>
                      <td>
                        <input v-model.number="exercise.restTime" type="number" min="0" class="form-control form-control-sm" :disabled="isReadOnly" />
                      </td>
                      <td>
                        <div class="d-flex flex-column gap-1">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            :disabled="isReadOnly || exerciseIndex === 0"
                            @click="moveExercise(day.id, exerciseIndex, 'up')"
                          >
                            Move Up
                          </button>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            :disabled="isReadOnly || exerciseIndex === day.exercises.length - 1"
                            @click="moveExercise(day.id, exerciseIndex, 'down')"
                          >
                            Move Down
                          </button>
                          <button type="button" class="btn btn-sm btn-outline-danger" :disabled="isReadOnly" @click="removeExercise(day.id, exerciseIndex)">Remove</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="day.exercises.length && !isReadOnly" class="day-card__footer mt-3">
                <button type="button" class="btn btn-sm admin-action-btn day-add-exercise-btn" :disabled="exerciseLibraryLoading" @click="openExercisePickerForDay(day.id)"><i v-if="exerciseLibraryLoading" class="fa-solid fa-spinner fa-spin day-add-exercise-btn__icon" aria-hidden="true"></i><i v-else class="fa-solid fa-plus day-add-exercise-btn__icon" aria-hidden="true"></i><span class="day-add-exercise-btn__label">+ Add Exercise</span></button>
              </div>
              </div>
            </article>

          </section>

          <footer class="builder-shell__footer mt-3">
            <button v-if="isReadOnly" type="button" class="btn btn-outline-light builder-secondary-btn" @click="builderVisible = false">Close</button>
            <template v-else>
              <button type="button" class="btn btn-sm admin-action-btn" @click="addDay">+ Add Day</button>
              <button type="button" class="btn btn-primary admin-primary-btn" :disabled="saving" @click="saveGlobalWorkout">
                <i v-if="saving" class="fa-solid fa-spinner fa-spin me-2"></i>
                Save Global Plan
              </button>
            </template>
          </footer>
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
  background: linear-gradient(180deg, #14233d 0%, #1b2a46 100%);
  box-shadow: 0 12px 24px rgba(7, 12, 28, 0.26);
}

.builder-shell {
  background: linear-gradient(180deg, #101d34 0%, #182847 100%);
  border-color: var(--agwp-border-strong);
}

.builder-shell__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.builder-shell__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--agwp-border);
  padding-top: 14px;
}

.builder-secondary-btn {
  border-color: rgba(192, 214, 247, 0.45) !important;
  color: #dce9fb !important;
}

.builder-secondary-btn:hover,
.builder-secondary-btn:focus {
  border-color: #dbe7f7 !important;
  color: #f7fbff !important;
  background: rgba(199, 220, 249, 0.1) !important;
}

.builder-section {
  border: 1px solid rgba(147, 184, 243, 0.28);
  border-radius: 12px;
  background: linear-gradient(180deg, #172743 0%, #1d2f4f 100%);
  padding: 14px;
}

.builder-plan-info {
  background: linear-gradient(180deg, #182b47 0%, #213556 100%);
  border-color: rgba(150, 192, 249, 0.3);
}

.builder-days {
  background: linear-gradient(180deg, #13233d 0%, #1b2f50 100%);
  border-color: rgba(125, 170, 236, 0.34);
}

.builder-section__header {
  border-bottom: 1px solid rgba(147, 184, 243, 0.25);
  padding-bottom: 10px;
  margin-bottom: 12px;
}

.builder-section__header h5 {
  color: #edf4ff;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: 0.86rem;
}

.builder-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 420px));
  gap: 10px 14px;
  max-width: 860px;
  align-items: start;
}

.builder-field {
  min-width: 0;
}

.builder-field--full {
  grid-column: 1 / -1;
}

.admin-panel--table {
  overflow: hidden;
}

.admin-global-workout-plans .form-label {
  color: #d7e6fb;
  font-weight: 600;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
}

.admin-global-workout-plans .form-control,
.admin-global-workout-plans .form-select {
  background: #0f1e35;
  border: 1px solid rgba(174, 204, 250, 0.55);
  color: #eef5ff;
  min-height: 42px;
  padding: 9px 12px;
  font-size: 0.95rem;
  line-height: 1.3;
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(214, 229, 251, 0.08), 0 0 0 1px rgba(8, 16, 30, 0.25);
}

.builder-plan-info .form-control,
.builder-plan-info .form-select {
  background: #132644;
}

.builder-plan-info .form-control:hover,
.builder-plan-info .form-select:hover {
  border-color: rgba(188, 214, 252, 0.72);
}

.builder-plan-info .form-control[readonly],
.builder-plan-info .form-control:disabled,
.builder-plan-info .form-select:disabled {
  background: #102039;
  border-color: rgba(164, 197, 245, 0.5);
  color: #e5f0ff;
  opacity: 1;
  -webkit-text-fill-color: #e5f0ff;
  cursor: default;
}

.builder-plan-info .form-select:disabled {
  background-image: linear-gradient(45deg, transparent 50%, #9bc0f5 50%), linear-gradient(135deg, #9bc0f5 50%, transparent 50%);
  background-position: calc(100% - 14px) calc(1em + 2px), calc(100% - 9px) calc(1em + 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.builder-plan-info textarea.form-control {
  min-height: 88px;
  resize: vertical;
}

.admin-global-workout-plans .form-control::placeholder {
  color: rgba(223, 236, 255, 0.78);
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
  color: #e7f1ff;
  border-bottom-color: var(--agwp-border);
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 700;
}

.admin-table td {
  color: #e5efff;
  border-color: color-mix(in srgb, var(--agwp-border) 70%, transparent 30%);
}

.admin-table__value {
  color: #e9f2ff !important;
  font-weight: 600;
}

.admin-table__field-name {
  display: none;
}

.admin-table-btn__icon {
  display: none;
}

.admin-table__value--name {
  color: #f5f9ff !important;
}

.admin-table-btn {
  border-radius: 8px;
  border: 1px solid transparent;
  color: #f7fbff !important;
  font-weight: 600;
  box-shadow: none;
}

.admin-table-btn--view {
  background: #0f7ea3;
  border-color: #0f7ea3;
}

.admin-table-btn--view:hover,
.admin-table-btn--view:focus {
  background: #0c6b8c;
  border-color: #0c6b8c;
  color: #ffffff !important;
}

.admin-table-btn--edit {
  background: #2563eb;
  border-color: #2563eb;
}

.admin-table-btn--edit:hover,
.admin-table-btn--edit:focus {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #ffffff !important;
}

.admin-table-btn--delete {
  background: #c62828;
  border-color: #c62828;
}

.admin-table-btn--delete:hover,
.admin-table-btn--delete:focus {
  background: #ad2121;
  border-color: #ad2121;
  color: #ffffff !important;
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
  border: 1px solid rgba(161, 194, 244, 0.38);
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(180deg, #1b2d4c 0%, #1f3254 100%);
  box-shadow: inset 0 1px 0 rgba(214, 229, 251, 0.08);
}

.day-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.day-card__title-wrap {
  min-width: 280px;
}

.day-card__title {
  color: #f3f8ff;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.day-card__control {
  max-width: 260px;
}

.day-card__label {
  text-transform: none;
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
  justify-content: flex-start;
}

.day-empty-state {
  border: 1px solid rgba(123, 175, 248, 0.5);
  border-radius: 10px;
  padding: 12px 14px;
  color: #d5e5fb;
  background: linear-gradient(180deg, #0f1c32 0%, #132540 100%);
  box-shadow: inset 0 0 0 1px rgba(173, 207, 255, 0.08);
}

.day-empty-state__title {
  color: #edf4ff;
  font-weight: 600;
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

/* Desktop: accordion headers hidden; bodies always shown */
.builder-accordion-hdr {
  display: none;
}
.builder-accordion-body,
.day-accordion-body {
  display: block;
}
/* Desktop: hide mobile-only icon in add-exercise button */
.day-add-exercise-btn__icon {
  display: none;
}

@media (max-width: 767px) {
  .admin-global-workout-plans__hero {
    padding: 16px;
  }

  .admin-global-workout-plans__hero h2 {
    font-size: 1.2rem;
  }

  .admin-global-workout-plans__hero .admin-primary-btn {
    margin-left: auto;
  }

  .panel-bg {
    padding: 14px;
  }

  /* ── Builder: flatten nested wrappers on mobile ─────────────────────
     Remove border/background/padding from inner sections and day-cards
     so the builder uses full card width instead of triple-nested boxes. */
  .admin-global-workout-plans .builder-shell {
    padding: 12px 10px;
  }

  .admin-global-workout-plans .builder-section {
    border: none !important;
    background: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }

  .admin-global-workout-plans .builder-section + .builder-section {
    margin-top: 8px;
    padding-top: 0 !important;
    border-top: none !important;
  }

  .admin-global-workout-plans .builder-section__header {
    display: none !important;
  }

  .admin-global-workout-plans .day-card {
    border: none !important;
    background: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .admin-global-workout-plans .day-card + .day-card {
    border-top: none !important;
    padding-top: 0 !important;
    margin-top: 8px;
  }

  .builder-shell__header,
  .builder-shell__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .builder-shell__footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .builder-shell__footer .btn {
    width: auto;
    min-height: 38px;
    padding: 6px 14px;
    font-size: 0.88rem;
    line-height: 1.2;
    flex: 0 0 auto;
  }

  .builder-form-grid {
    grid-template-columns: 1fr;
    max-width: 100%;
  }

  .day-card__head {
    flex-direction: column;
    align-items: stretch;
  }

  .day-card__title-wrap,
  .day-card__control {
    min-width: 0;
    max-width: 100%;
  }

  .day-card__label {
    max-width: 100%;
  }

  .day-card__actions {
    display: none !important;
  }

  .mobile-table .table-responsive {
    background: transparent !important;
  }

  .mobile-table .admin-table {
    --bs-table-color: #eaf3ff !important;
    --bs-table-bg: transparent !important;
    --bs-table-striped-bg: transparent !important;
    --bs-table-hover-bg: transparent !important;
    --bs-table-accent-bg: transparent !important;
    border-collapse: separate;
    border-spacing: 0 10px;
    background: transparent !important;
    margin-bottom: 0;
  }

  .mobile-table .table,
  .mobile-table .table tbody,
  .mobile-table .table tr,
  .mobile-table .table td,
  .mobile-table .table th {
    background: transparent !important;
  }

  .mobile-table .admin-table > :not(caption) > * > * {
    background-color: transparent !important;
    box-shadow: none !important;
    color: #eaf3ff;
  }

  .mobile-table .admin-table thead {
    display: none;
  }

  .mobile-table .admin-table tbody,
  .mobile-table .admin-table tr,
  .mobile-table .admin-table td {
    display: block;
    width: 100%;
  }

  .mobile-table .admin-table tbody tr {
    background: linear-gradient(180deg, #152845 0%, #1d3253 100%);
    border: 1px solid rgba(137, 181, 246, 0.34);
    border-radius: 10px;
    padding: 7px 10px;
    overflow: hidden;
    box-shadow: inset 0 1px 0 rgba(227, 239, 255, 0.08);
  }

  .mobile-table .admin-table {
    border-spacing: 0 8px;
  }

  .mobile-table .admin-table tbody td {
    margin: 0;
    padding: 0;
    border: 0;
    background-color: transparent !important;
    background-image: none !important;
    color: #eaf3ff;
    text-align: left !important;
  }

  .mobile-table .admin-table tbody td:first-child {
    display: block !important;
    padding-bottom: 5px !important;
    margin-bottom: 3px !important;
    border-bottom: 1px solid rgba(138, 181, 246, 0.25);
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .mobile-table .admin-table tbody td:nth-child(n+2):nth-child(-n+7) {
    display: flex !important;
    flex-direction: row !important;
    justify-content: flex-start !important;
    align-items: center !important;
    gap: 8px;
    font-size: 0.76rem;
    padding: 1px 0 !important;
    line-height: 1.25;
    width: 100%;
  }

  .mobile-table .admin-table tbody td:nth-child(n+2):nth-child(-n+7) .admin-table__field-name {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
    color: #9ab4dc;
    font-weight: 500;
    font-size: 0.7rem;
    letter-spacing: 0.01em;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .mobile-table .admin-table tbody td:nth-child(n+2):nth-child(-n+7) .admin-table__field-icon {
    font-size: 0.68rem;
    width: 14px;
    text-align: center;
    color: #7fa6e8;
    flex-shrink: 0;
  }

  .mobile-table .admin-table tbody td:nth-child(n+2):nth-child(-n+7) .admin-table__field-value {
    margin-left: auto;
    display: inline-flex;
    flex: 1 1 auto;
    justify-content: flex-end;
    min-width: 0;
    color: #ffffff;
    font-weight: 600;
    font-size: 0.76rem;
    text-align: right;
  }

  .mobile-table .admin-table tbody td:last-child {
    display: block !important;
    padding-top: 6px !important;
    margin-top: 4px !important;
    border-top: 1px solid rgba(138, 181, 246, 0.25);
  }

  .mobile-table .admin-table tbody td:last-child > div {
    display: flex !important;
    width: 100%;
    margin-left: auto;
    justify-content: flex-end !important;
    gap: 8px !important;
  }

  .mobile-table .admin-table .admin-table-btn {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    min-width: 42px;
    min-height: 42px !important;
    padding: 0 !important;
    font-size: 1rem;
    line-height: 1;
    border-radius: 10px !important;
  }

  .mobile-table .admin-table .admin-table-btn__icon {
    display: inline-flex !important;
    margin: 0 !important;
  }

  .mobile-table .admin-table .admin-table-btn__label {
    display: none !important;
  }

  /* ── Builder Accordions ─────────────────────────────────────────────── */
  .admin-global-workout-plans .builder-accordion-hdr {
    display: flex !important;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
    width: 100%;
    min-height: 42px !important;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s ease;
  }

  .admin-global-workout-plans .builder-accordion-hdr:active {
    opacity: 0.85;
  }

  .admin-global-workout-plans .builder-accordion-hdr--plan {
    background: linear-gradient(135deg, #1a3d82 0%, #1f4490 100%);
  }

  .admin-global-workout-plans .builder-accordion-hdr--day {
    background: linear-gradient(135deg, #0d5e62 0%, #0b6e73 100%);
  }

  .admin-global-workout-plans .builder-accordion-hdr__icon {
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.88rem;
    flex-shrink: 0;
  }

  .admin-global-workout-plans .builder-accordion-hdr__title {
    flex: 1;
    color: #ffffff;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .admin-global-workout-plans .builder-accordion-hdr__chevron {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.78rem;
    flex-shrink: 0;
    transition: transform 0.2s ease;
    margin-left: auto;
  }

  .admin-global-workout-plans .builder-section--open .builder-accordion-hdr__chevron,
  .admin-global-workout-plans .day-card--open .builder-accordion-hdr__chevron {
    transform: rotate(180deg);
  }

  .admin-global-workout-plans .builder-accordion-body,
  .admin-global-workout-plans .day-accordion-body {
    display: none;
  }

  .admin-global-workout-plans .builder-section--open .builder-accordion-body {
    display: block;
    padding-top: 12px;
  }

  .admin-global-workout-plans .day-card--open .day-accordion-body {
    display: block;
    padding-top: 12px;
  }

  /* ── Trash icon in day accordion header ──────────────────── */
  .admin-global-workout-plans .day-accordion-trash {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px !important;
    padding: 0 !important;
    border-radius: 8px !important;
    background: #b91c1c;
    border: none;
    color: #fff;
    flex-shrink: 0;
    cursor: pointer;
  }
  .admin-global-workout-plans .day-accordion-trash:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .admin-global-workout-plans .day-accordion-trash i {
    font-size: 0.76rem;
    color: #fff;
    pointer-events: none;
  }

  /* ── Add Exercise compact icon button on mobile ───────── */
  .admin-global-workout-plans .day-add-exercise-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    padding: 0 !important;
    border-radius: 10px !important;
    background: #1d4ed8 !important;
    border: none !important;
    color: #fff !important;
    flex-shrink: 0;
  }
  .admin-global-workout-plans .day-add-exercise-btn .day-add-exercise-btn__label {
    display: none !important;
  }
  .admin-global-workout-plans .day-add-exercise-btn .day-add-exercise-btn__icon {
    display: inline-flex !important;
    font-size: 1rem;
    color: #fff;
    pointer-events: none;
  }

  /* ── Empty-state row layout (text left, + button right) ─ */
  .admin-global-workout-plans .day-empty-state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .admin-global-workout-plans .day-empty-state .day-empty-state__title {
    flex: 1;
    margin-bottom: 0 !important;
  }

  /* ── Footer: right-align the + button when exercises exist ─ */
  .admin-global-workout-plans .day-card__footer {
    justify-content: flex-end;
  }
}

@media (max-width: 420px) {
  .admin-global-workout-plans .builder-shell__footer {
    align-items: flex-start;
  }

  .admin-global-workout-plans .builder-shell__footer .btn {
    width: fit-content;
    max-width: 100%;
  }

  .admin-global-workout-plans .builder-shell__footer .admin-primary-btn {
    align-self: flex-end;
  }
}
</style>
