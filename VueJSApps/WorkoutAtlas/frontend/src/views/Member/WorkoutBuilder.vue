<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkoutMetadataForm from '@/components/workout-builder/WorkoutMetadataForm.vue';
import ExercisePickerModal from '@/components/workout-builder/ExercisePickerModal.vue';
import WorkoutExerciseBlock from '@/components/workout-builder/WorkoutExerciseBlock.vue';
import WorkoutScheduleListItem from '@/components/workout-builder/WorkoutScheduleListItem.vue';
import { API_BASE } from '@/config/env';
import { refreshWorkoutStatus, setUserWorkoutStatus } from '@/composable/workoutStatusManager';
import { getExerciseImage } from '@/utils/exerciseImage';

const metadata = ref({
  name: '',
  description: '',
  type: 'Strength',
  planType: '',
  estimatedDuration: 45,
  goals: [],
  otherGoal: '',
});

const allExercises = ref([]);
const workoutExercises = ref([]);
const pickerOpen = ref(false);
const loadingExercises = ref(false);
const loadingPlanner = ref(false);
const loadingFeaturedPlans = ref(false);
const cloningFeaturedPlanId = ref('');
const saving = ref(false);
const saveMessage = ref('');
const plannerMessage = ref('');
const userId = ref(null);
const currentPlanId = ref('');
const selectedWorkoutId = ref('');
const workoutSchedules = ref([]);
const isCreatingWorkout = ref(false);
const hasSavedWorkoutDetails = ref(false);
const deletingWorkoutId = ref('');
const hasSavedWorkoutExerciseList = ref(false);
const canCreateFeaturedPlans = ref(false);
const isWorkoutDetailsOpen = ref(true);
const isSchedulePlannerOpen = ref(true);
const openMenuDay = ref(null);
const openMenuPlacement = ref('down');
const aiPrompt = ref('');
const aiResponse = ref('');
const aiLoading = ref(false);
const gatewayTestLoading = ref(false);
const aiError = ref('');
const isAdminUser = ref(false);

const MENU_ESTIMATED_HEIGHT = 260;
const MENU_SAFE_GAP = 12;

const getDayMenuPlacement = (buttonEl) => {
  if (!buttonEl || typeof window === 'undefined') {
    return 'down';
  }

  const rect = buttonEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  return spaceBelow < MENU_ESTIMATED_HEIGHT + MENU_SAFE_GAP && spaceAbove > spaceBelow ? 'up' : 'down';
};

const closeDayMenu = (e) => {
  if (inlineEditingDayName.value && !e.target.closest('.day-title-edit-wrap')) {
    saveInlineDayNameEdit();
  }

  if (!e.target.closest('.day-kebab-wrap')) {
    openMenuDay.value = null;
    openMenuPlacement.value = 'down';
  }
};

const toggleDayMenu = (dayName, event) => {
  if (openMenuDay.value === dayName) {
    openMenuDay.value = null;
    openMenuPlacement.value = 'down';
    return;
  }

  openMenuPlacement.value = getDayMenuPlacement(event?.currentTarget);
  openMenuDay.value = dayName;
};
const route = useRoute();
const router = useRouter();

// Tab: 'select' | 'create' | 'ai'
const builderTab = ref('select');
const mainAccordion = ref({
  build: true,
  existing: false,
});

const scheduleMode = ref('day');
const dayGroups = ref([]);
const weekGroups = ref([]);
const dayGroupOrders = ref([]);
const weekGroupOrders = ref([]);
const selectedScheduleGroup = ref(null);
const newScheduleGroupName = ref('');
const inlineEditingDayName = ref('');
const inlineDayNameDraft = ref('');
const showDeleteModal = ref(false);
const dayToDelete = ref(null);
const skipNextRoutePlannerLoad = ref(false);

const featuredWorkoutPlans = ref([]);
const currentWorkoutPlanSlide = ref(0);
const selectedTemplatePlanId = ref('');
const selectedTemplatePlanName = ref('');

const featuredWorkoutPlanSlides = computed(() => {
  if (!Array.isArray(featuredWorkoutPlans.value) || !featuredWorkoutPlans.value.length) {
    return [];
  }

  const grouped = new Map();
  featuredWorkoutPlans.value.forEach((plan) => {
    const title = String(plan?.type || 'Featured').trim() || 'Featured';
    if (!grouped.has(title)) {
      grouped.set(title, []);
    }

    grouped.get(title).push({
      planId: String(plan?.planId || '').trim(),
      name: String(plan?.name || '').trim() || 'Untitled Workout',
      description: String(plan?.description || '').trim(),
      estimatedDuration: Number(plan?.estimatedDuration || 0),
      exerciseCount: Number(plan?.exerciseCount || 0),
    });
  });

  return Array.from(grouped.entries()).map(([title, plans]) => ({ title, plans }));
});

const hasFeaturedWorkoutPlans = computed(() => featuredWorkoutPlanSlides.value.length > 0);
const hasMultipleFeaturedWorkoutPlanSlides = computed(() => featuredWorkoutPlanSlides.value.length > 1);

const activeWorkoutPlanSlide = computed(() => {
  if (!featuredWorkoutPlanSlides.value.length) {
    return { title: 'Featured Workout Plans', plans: [] };
  }

  const safeIndex = Math.min(
    Math.max(Number(currentWorkoutPlanSlide.value || 0), 0),
    featuredWorkoutPlanSlides.value.length - 1
  );
  return featuredWorkoutPlanSlides.value[safeIndex];
});

const setWorkoutPlanSlide = (index) => {
  if (index < 0 || index >= featuredWorkoutPlanSlides.value.length) {
    return;
  }
  currentWorkoutPlanSlide.value = index;
};

const goToNextWorkoutPlanSlide = () => {
  const total = featuredWorkoutPlanSlides.value.length;
  if (!total) {
    return;
  }

  const nextIndex = currentWorkoutPlanSlide.value >= total - 1
    ? 0
    : currentWorkoutPlanSlide.value + 1;
  setWorkoutPlanSlide(nextIndex);
};

const goToPreviousWorkoutPlanSlide = () => {
  const total = featuredWorkoutPlanSlides.value.length;
  if (!total) {
    return;
  }

  const previousIndex = currentWorkoutPlanSlide.value <= 0
    ? total - 1
    : currentWorkoutPlanSlide.value - 1;
  setWorkoutPlanSlide(previousIndex);
};

const setSelectedTemplatePlan = (plan) => {
  selectedTemplatePlanId.value = String(plan?.planId || '').trim();
  selectedTemplatePlanName.value = String(plan?.name || '').trim();
};

const selectTemplatePlan = async (plan) => {
  const templatePlanId = String(plan?.planId || '').trim();
  if (!templatePlanId) {
    return;
  }

  setSelectedTemplatePlan(plan);

  if (!userId.value) {
    saveMessage.value = 'Unable to resolve user session. Please login again.';
    return;
  }

  cloningFeaturedPlanId.value = templatePlanId;
  saveMessage.value = '';
  try {
    const response = await fetch(`${API_BASE}/api/featured-workout-plans/${encodeURIComponent(templatePlanId)}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to copy featured workout plan.');
    }

    const data = await response.json();
    syncWorkoutPlannerCapabilities(data);
    syncWorkoutSchedules(data?.workoutLists);

    const planner = data?.planner || {};
    const newPlanId = String(planner?.planId || '').trim();
    if (!newPlanId) {
      throw new Error('Featured workout copied, but no personal plan was returned.');
    }

    selectedWorkoutId.value = newPlanId;
    currentPlanId.value = newPlanId;
    isCreatingWorkout.value = true;
    hasSavedWorkoutDetails.value = false;

    hydratePlanner(planner, { markSaved: false });
    builderTab.value = 'create';
    saveMessage.value = 'Featured workout plan loaded. Save to keep your personal copy.';

    await router.replace({ query: { ...route.query, planId: newPlanId } });
  } catch (error) {
    saveMessage.value = error.message || 'Failed to copy featured workout plan.';
  } finally {
    cloningFeaturedPlanId.value = '';
  }
};

const openMainAccordion = (panel) => {
  if (panel !== 'build' && panel !== 'existing') {
    return;
  }
  mainAccordion.value[panel] = !mainAccordion.value[panel];
};

const sortGroupsByOrder = (groups = [], orderEntries = []) => {
  const normalized = Array.isArray(groups)
    ? groups.map((value) => String(value || '').trim()).filter(Boolean)
    : [];

  if (!normalized.length) {
    return [];
  }

  const fallbackOrderMap = new Map();
  normalized.forEach((label, index) => {
    fallbackOrderMap.set(label.toLowerCase(), index + 1);
  });

  const explicitOrderMap = new Map();
  if (Array.isArray(orderEntries)) {
    orderEntries.forEach((entry, index) => {
      const label = String(entry?.label || '').trim();
      if (!label) {
        return;
      }
      const parsed = Number(entry?.sortOrder);
      explicitOrderMap.set(label.toLowerCase(), Number.isFinite(parsed) && parsed > 0 ? parsed : index + 1);
    });
  }

  return [...normalized].sort((left, right) => {
    const leftKey = left.toLowerCase();
    const rightKey = right.toLowerCase();
    const leftOrder = explicitOrderMap.get(leftKey) ?? fallbackOrderMap.get(leftKey) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = explicitOrderMap.get(rightKey) ?? fallbackOrderMap.get(rightKey) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return (fallbackOrderMap.get(leftKey) || 0) - (fallbackOrderMap.get(rightKey) || 0);
  });
};

const buildOrderEntries = (groups = []) => {
  return groups.map((label, index) => ({
    label,
    sortOrder: index + 1,
  }));
};

const syncGroupOrders = (mode, groups) => {
  const ordered = buildOrderEntries(groups);
  if (mode === 'week') {
    weekGroupOrders.value = ordered;
  } else {
    dayGroupOrders.value = ordered;
  }
};

const activeGroups = computed(() => {
  return sortGroupsByOrder(dayGroups.value, dayGroupOrders.value);
});

const hasMultipleScheduleGroups = computed(() => activeGroups.value.length > 1);

const workoutDaysWithExercises = computed(() => {
  return activeGroups.value.map((groupName) => {
    const exercises = workoutExercises.value.filter(
      (ex) => String(ex?.scheduleGroup || '').trim() === groupName
    );
    return {
      name: groupName,
      exercises,
      exerciseCount: exercises.length,
    };
  });
});

const hasWorkoutSchedules = computed(() => workoutSchedules.value.length > 0);
const canShowWorkoutDetails = computed(() => isCreatingWorkout.value || Boolean(selectedWorkoutId.value));
const showSaveFooter = computed(() => builderTab.value === 'create' && canShowWorkoutDetails.value);
const primarySaveLabel = computed(() => {
  return saving.value ? 'Saving Workout Plan...' : 'Save Workout Plan';
});

const plannerGroupsWithExercises = computed(() => {
  const groups = activeGroups.value;

  if (!groups.length) {
    return [];
  }

  return groups.map((group) => ({
    name: group,
    exercises: workoutExercises.value
      .map((exercise, index) => ({ exercise, index }))
      .filter((entry) => String(entry.exercise?.scheduleGroup || '').trim() === group),
  }));
});

const totalDuration = computed(() => {
  const fromBlocks = workoutExercises.value.reduce((total, exercise) => total + Number(exercise.duration || 0), 0);
  if (fromBlocks > 0) {
    return fromBlocks;
  }
  return Number(metadata.value.estimatedDuration || 0);
});

const completedVolume = computed(() => {
  return workoutExercises.value.reduce((total, exercise) => {
    return total + Number(exercise.sets || 0) * Number(exercise.reps || 0) * Number(exercise.weight || 0);
  }, 0);
});

const formatUpdatedAt = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString();
};

const syncWorkoutSchedules = (incomingLists = []) => {
  workoutSchedules.value = (Array.isArray(incomingLists) ? incomingLists : []).map((plan) => ({
    ...plan,
    updatedAtLabel: formatUpdatedAt(plan.updatedAt),
  }));
};

const syncWorkoutPlannerCapabilities = (payload = {}) => {
  canCreateFeaturedPlans.value = Boolean(payload?.canCreateFeaturedPlans);
};

const resetPlannerDraft = () => {
  metadata.value = {
    name: '',
    description: '',
    type: 'Strength',
    planType: '',
    estimatedDuration: 45,
    goals: [],
    otherGoal: '',
  };
  currentPlanId.value = '';
  workoutExercises.value = [];
  scheduleMode.value = 'day';
  dayGroups.value = [];
  weekGroups.value = [];
  dayGroupOrders.value = [];
  weekGroupOrders.value = [];
  selectedScheduleGroup.value = null;
  newScheduleGroupName.value = '';
  inlineEditingDayName.value = '';
  inlineDayNameDraft.value = '';
  plannerMessage.value = '';
  saveMessage.value = '';
  isWorkoutDetailsOpen.value = true;
  isSchedulePlannerOpen.value = true;
};

const normalizeLoadedDayGroups = (planner = {}) => {
  const fromDays = Array.isArray(planner?.dayGroups) ? planner.dayGroups : [];
  const fromExercises = Array.isArray(planner?.exercises)
    ? planner.exercises.map((exercise) => String(exercise?.scheduleGroup || '').trim()).filter(Boolean)
    : [];

  const merged = [...fromDays, ...fromExercises]
    .map((name) => String(name || '').trim())
    .filter(Boolean)
    .filter((name, index, source) => source.findIndex((entry) => entry.toLowerCase() === name.toLowerCase()) === index);

  return merged;
};

const hydratePlanner = (planner = {}, { markSaved = true } = {}) => {
  currentPlanId.value = String(planner?.planId || '').trim();

  const incomingGoals = Array.isArray(planner?.metadata?.goals)
    ? planner.metadata.goals.map((goal) => String(goal || '').trim()).filter(Boolean)
    : [];

  metadata.value = {
    name: planner?.metadata?.name || '',
    description: planner?.metadata?.description || '',
    type: planner?.metadata?.type || 'Strength',
    planType: String(planner?.metadata?.planType || '').trim(),
    estimatedDuration: Number(planner?.metadata?.estimatedDuration || 45),
    goals: incomingGoals,
    otherGoal: String(planner?.metadata?.otherGoal || '').trim(),
  };

  scheduleMode.value = 'day';
  const incomingDayGroups = normalizeLoadedDayGroups(planner);
  const incomingWeekGroups = Array.isArray(planner?.weekGroups) ? planner.weekGroups : [];

  const incomingDayOrders = Array.isArray(planner?.dayGroupOrders) ? planner.dayGroupOrders : [];
  const incomingWeekOrders = Array.isArray(planner?.weekGroupOrders) ? planner.weekGroupOrders : [];

  dayGroups.value = sortGroupsByOrder(incomingDayGroups, incomingDayOrders);
  weekGroups.value = sortGroupsByOrder(incomingWeekGroups, incomingWeekOrders);

  syncGroupOrders('day', dayGroups.value);
  syncGroupOrders('week', weekGroups.value);

  workoutExercises.value = Array.isArray(planner?.exercises)
    ? planner.exercises.map((exercise) => ({
        ...exercise,
        scheduleGroup: String(exercise?.scheduleGroup || '').trim(),
      }))
    : [];

  const assignedGroups = Array.from(
    new Set(workoutExercises.value.map((exercise) => String(exercise.scheduleGroup || '').trim()).filter(Boolean))
  );

  const appendMissingGroups = (groups) => {
    const next = [...groups];
    assignedGroups.forEach((label) => {
      const normalized = String(label || '').trim().toLowerCase();
      if (!normalized) {
        return;
      }
      if (!next.some((group) => String(group || '').trim().toLowerCase() === normalized)) {
        next.push(label);
      }
    });
    return next;
  };

  dayGroups.value = appendMissingGroups(dayGroups.value);
  syncGroupOrders('day', dayGroups.value);
  
  // Auto-select first group when loading workout
  selectedScheduleGroup.value = dayGroups.value[0] || null;

  hasSavedWorkoutDetails.value = markSaved;
  inlineEditingDayName.value = '';
  inlineDayNameDraft.value = '';
  newScheduleGroupName.value = '';
  isWorkoutDetailsOpen.value = true;
  isSchedulePlannerOpen.value = markSaved;
  builderTab.value = 'create';
};

const clearSelection = async () => {
  selectedWorkoutId.value = '';
  isCreatingWorkout.value = false;
  hasSavedWorkoutDetails.value = false;
  builderTab.value = 'select';
  resetPlannerDraft();
  await router.replace({ query: { ...route.query, planId: undefined } });
};

const openPicker = () => {
  pickerOpen.value = true;
};

const closePicker = () => {
  pickerOpen.value = false;
};

const createWorkoutPlan = async () => {
  saveMessage.value = '';
  if (!userId.value) {
    saveMessage.value = 'Unable to resolve user session. Please login again.';
    return;
  }

  // Always start a new draft from a clean planner state.
  dayGroups.value = [];
  weekGroups.value = [];
  syncGroupOrders('day', []);
  syncGroupOrders('week', []);
  selectedScheduleGroup.value = null;
  workoutExercises.value = [];
  plannerMessage.value = '';

  loadingPlanner.value = true;
  try {
    const response = await fetch(`${API_BASE}/api/workout-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleMode: 'day' }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to create workout plan.');
    }

    const data = await response.json();
    syncWorkoutPlannerCapabilities(data);
    const planner = data?.planner || {};
    const createdPlanId = String(planner?.planId || '').trim();

    if (!createdPlanId) {
      throw new Error('Workout plan was created but no plan ID was returned.');
    }

    syncWorkoutSchedules(data?.workoutLists);
    selectedWorkoutId.value = createdPlanId;
    currentPlanId.value = createdPlanId;
    isCreatingWorkout.value = true;
    hasSavedWorkoutDetails.value = false;

    metadata.value = {
      name: '',
      description: '',
      type: planner?.metadata?.type || 'Strength',
      planType: String(planner?.metadata?.planType || '').trim(),
      estimatedDuration: Number(planner?.metadata?.estimatedDuration || 45),
      goals: Array.isArray(planner?.metadata?.goals)
        ? planner.metadata.goals.map((goal) => String(goal || '').trim()).filter(Boolean)
        : [],
      otherGoal: String(planner?.metadata?.otherGoal || '').trim(),
    };

    // New plans must begin with zero workout days regardless of backend defaults.
    scheduleMode.value = 'day';
    dayGroups.value = [];
    weekGroups.value = [];

    syncGroupOrders('day', []);
    syncGroupOrders('week', []);

    selectedScheduleGroup.value = null;
    
    workoutExercises.value = [];
    plannerMessage.value = '';
    isWorkoutDetailsOpen.value = true;
    isSchedulePlannerOpen.value = false;
    builderTab.value = 'create';

    skipNextRoutePlannerLoad.value = true;
    await router.replace({ query: { ...route.query, planId: createdPlanId } });
    saveMessage.value = 'Draft workout plan created. Add details and save to continue.';
  } catch (error) {
    saveMessage.value = error.message || 'Failed to create workout plan.';
  } finally {
    loadingPlanner.value = false;
  }
};

const clearScheduleGroupEdit = () => {
  inlineEditingDayName.value = '';
  inlineDayNameDraft.value = '';
};

const canRemoveScheduleGroup = (groupName) => {
  const target = dayGroups.value;
  if (!target.length) {
    return false;
  }
  const normalized = String(groupName || '').trim().toLowerCase();
  return target.some((group) => String(group || '').trim().toLowerCase() === normalized);
};

const addScheduleGroup = () => {
  const name = String(newScheduleGroupName.value || '').trim();
  if (!name) {
    plannerMessage.value = 'Enter a workout day name before adding.';
    return;
  }

  const target = dayGroups;
  const normalizedName = name.toLowerCase();

  if (target.value.some((group) => String(group).toLowerCase() === normalizedName)) {
    plannerMessage.value = `${name} already exists.`;
    return;
  }

  target.value = [...target.value, name];
  syncGroupOrders('day', target.value);
  
  // Auto-select first day if none is selected
  if (!selectedScheduleGroup.value) {
    selectedScheduleGroup.value = name;
  }
  
  newScheduleGroupName.value = '';
  plannerMessage.value = '';
};

const setActiveDay = (groupName) => {
  selectedScheduleGroup.value = groupName;
  plannerMessage.value = '';
};

const startInlineDayNameEdit = (groupName) => {
  const name = String(groupName || '').trim();
  if (!name) {
    return;
  }

  selectedScheduleGroup.value = name;
  inlineEditingDayName.value = name;
  inlineDayNameDraft.value = name;
  plannerMessage.value = '';
};

const saveInlineDayNameEdit = () => {
  const target = dayGroups;
  const oldName = String(inlineEditingDayName.value || '').trim();
  if (!oldName) {
    return;
  }

  const suggestedName = String(inlineDayNameDraft.value || '').trim();

  if (!suggestedName || suggestedName === oldName) {
    clearScheduleGroupEdit();
    return;
  }

  const normalizedNew = suggestedName.toLowerCase();
  const normalizedOld = oldName.toLowerCase();
  if (target.value.some((group) => String(group || '').trim().toLowerCase() === normalizedNew)) {
    plannerMessage.value = `${suggestedName} already exists.`;
    return;
  }

  target.value = target.value.map((group) => (
    String(group || '').trim().toLowerCase() === normalizedOld ? suggestedName : group
  ));
  syncGroupOrders('day', target.value);

  workoutExercises.value = workoutExercises.value.map((exercise) => {
    if (String(exercise.scheduleGroup || '').trim().toLowerCase() === normalizedOld) {
      return { ...exercise, scheduleGroup: suggestedName };
    }
    return exercise;
  });

  if (String(selectedScheduleGroup.value || '').trim().toLowerCase() === normalizedOld) {
    selectedScheduleGroup.value = suggestedName;
  }

  clearScheduleGroupEdit();
  plannerMessage.value = '';
};

const removeScheduleGroup = (groupName) => {
  if (!canRemoveScheduleGroup(groupName)) {
    plannerMessage.value = 'Workout day was not found.';
    return;
  }

  const target = dayGroups;
  const normalizedRemovedName = String(groupName || '').trim().toLowerCase();

  const nextGroups = target.value.filter(
    (group) => String(group || '').trim().toLowerCase() !== normalizedRemovedName
  );
  target.value = nextGroups;
  syncGroupOrders('day', target.value);

  if (String(inlineEditingDayName.value || '').trim().toLowerCase() === normalizedRemovedName) {
    clearScheduleGroupEdit();
  }

  workoutExercises.value = workoutExercises.value.map((exercise) => {
    if (String(exercise.scheduleGroup || '').trim().toLowerCase() === normalizedRemovedName) {
      return { ...exercise, scheduleGroup: '' };
    }
    return exercise;
  });
  
  // Clear selection if the selected group was removed
  if (selectedScheduleGroup.value && String(selectedScheduleGroup.value).trim().toLowerCase() === normalizedRemovedName) {
    selectedScheduleGroup.value = target.value[0] || null;
  }

  plannerMessage.value = '';
};

const changeScheduleMode = (mode) => {
  scheduleMode.value = 'day';
  clearScheduleGroupEdit();
  dayGroups.value = sortGroupsByOrder(dayGroups.value, dayGroupOrders.value);
  syncGroupOrders('day', dayGroups.value);
  plannerMessage.value = '';
  const firstGroup = activeGroups.value[0] || null;

  selectedScheduleGroup.value = firstGroup;

  workoutExercises.value = workoutExercises.value.map((exercise) => ({
    ...exercise,
    scheduleGroup: activeGroups.value.includes(exercise.scheduleGroup)
      ? exercise.scheduleGroup
      : '',
  }));
};

const toggleWorkoutDetails = () => {
  isWorkoutDetailsOpen.value = !isWorkoutDetailsOpen.value;
};

const toggleSchedulePlanner = () => {
  isSchedulePlannerOpen.value = !isSchedulePlannerOpen.value;
};

// Helper function to resolve exercise image path
const resolveExerciseImage = (exercise) => {
  return getExerciseImage(exercise);
};

const createBlock = (exercise) => {
  const wt = String(exercise.WorkoutType || metadata.value.type || '').trim().toLowerCase();
  const isCardio = wt === 'cardio';
  return {
    id: `${exercise.ExerciseID}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    exerciseId: exercise.ExerciseID,
    name: exercise.ExerciseTitle,
    image: resolveExerciseImage(exercise),
    ImageURL: exercise.ImageURL || '',
    ImageGallery: exercise.ImageGallery || '',
    workoutType: exercise.WorkoutType || metadata.value.type,
    muscleGroup: exercise.MuscleGroup || '',
    equipment: exercise.Equipment || '',
    recordingType: exercise.RecordingType || '',
    // Strength fields — blank for cardio
    sets:     isCardio ? 0 : 0,
    reps:     isCardio ? 0 : 0,
    weight:   0,
    restTime: isCardio ? 0 : 0,
    // Cardio fields — blank for strength
    duration: 0,
    distance: 0,
    speed:    0,
    calories: 0,
    notes: '',
    scheduleGroup: '',
  };
};

const addExerciseToWorkout = (incoming) => {
  // Validate that a day/week is selected
  if (!selectedScheduleGroup.value) {
    plannerMessage.value = 'Select a workout day before adding exercises.';
    return;
  }
  
  // Verify the selected group still exists
  if (!activeGroups.value.includes(selectedScheduleGroup.value)) {
    plannerMessage.value = 'Selected workout day was not found.';
    selectedScheduleGroup.value = null;
    return;
  }

  const selectedGroup = selectedScheduleGroup.value;
  const exercisesToAdd = Array.isArray(incoming) ? incoming : [incoming];
  const validExercises = exercisesToAdd.filter((exercise) => Number(exercise?.ExerciseID || 0) > 0);

  if (!validExercises.length) {
    plannerMessage.value = 'No valid exercises were selected.';
    return;
  }

  // Preserve the selected order from the picker when adding multiple exercises.
  validExercises.forEach((exercise) => {
    const block = createBlock(exercise);
    block.scheduleGroup = selectedGroup;
    workoutExercises.value.push(block);
  });
  
  saveMessage.value = '';
  plannerMessage.value = '';
};

const updateExerciseField = ({ id, field, value }) => {
  const target = workoutExercises.value.find((exercise) => exercise.id === id);
  if (!target) {
    return;
  }

  target[field] = value;
};

const removeExercise = (id) => {
  workoutExercises.value = workoutExercises.value.filter((exercise) => exercise.id !== id);
};

const moveExerciseUp = (id) => {
  const index = workoutExercises.value.findIndex((exercise) => exercise.id === id);
  if (index <= 0) {
    return;
  }

  const next = [...workoutExercises.value];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  workoutExercises.value = next;
};

const moveExerciseDown = (id) => {
  const index = workoutExercises.value.findIndex((exercise) => exercise.id === id);
  if (index < 0 || index >= workoutExercises.value.length - 1) {
    return;
  }

  const next = [...workoutExercises.value];
  [next[index + 1], next[index]] = [next[index], next[index + 1]];
  workoutExercises.value = next;
};

const moveScheduleGroup = (groupName, direction = 'up') => {
  const targetRef = dayGroups;
  const ordered = [...targetRef.value];
  const index = ordered.findIndex(
    (group) => String(group || '').trim().toLowerCase() === String(groupName || '').trim().toLowerCase()
  );

  if (index < 0) {
    return;
  }

  if (direction === 'up' && index > 0) {
    [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
  } else if (direction === 'down' && index < ordered.length - 1) {
    [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
  } else {
    return;
  }

  targetRef.value = ordered;
  syncGroupOrders('day', ordered);
};

const moveScheduleGroupUp = (groupName) => moveScheduleGroup(groupName, 'up');
const moveScheduleGroupDown = (groupName) => moveScheduleGroup(groupName, 'down');

const resetScheduleGroupOrder = () => {
  const targetRef = dayGroups;
  const ordered = [...targetRef.value];
  syncGroupOrders('day', ordered);
  plannerMessage.value = '';
};

const duplicateScheduleGroup = (groupName) => {
  const sourceName = String(groupName || '').trim();
  if (!sourceName) return;

  const sourceIndex = dayGroups.value.findIndex(
    (name) => String(name || '').trim().toLowerCase() === sourceName.toLowerCase()
  );
  if (sourceIndex < 0) return;

  let suffix = 2;
  let duplicateName = `${sourceName} Copy`;
  const lowerSet = new Set(dayGroups.value.map((name) => String(name || '').trim().toLowerCase()));
  while (lowerSet.has(duplicateName.toLowerCase())) {
    duplicateName = `${sourceName} Copy ${suffix}`;
    suffix += 1;
  }

  const nextGroups = [...dayGroups.value];
  nextGroups.splice(sourceIndex + 1, 0, duplicateName);
  dayGroups.value = nextGroups;
  syncGroupOrders('day', dayGroups.value);

  const sourceExercises = workoutExercises.value.filter(
    (exercise) => String(exercise.scheduleGroup || '').trim().toLowerCase() === sourceName.toLowerCase()
  );

  const clonedExercises = sourceExercises.map((exercise) => ({
    ...exercise,
    id: `${exercise.id || exercise.exerciseId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    scheduleGroup: duplicateName,
  }));

  workoutExercises.value = [...workoutExercises.value, ...clonedExercises];
  selectedScheduleGroup.value = duplicateName;
  plannerMessage.value = '';
};

const isFirstScheduleGroup = (groupName) => {
  const normalized = String(groupName || '').trim().toLowerCase();
  return String(activeGroups.value[0] || '').trim().toLowerCase() === normalized;
};

const isLastScheduleGroup = (groupName) => {
  const normalized = String(groupName || '').trim().toLowerCase();
  return String(activeGroups.value[activeGroups.value.length - 1] || '').trim().toLowerCase() === normalized;
};

const plannerPayload = computed(() => ({
  planId: currentPlanId.value || undefined,
  metadata: {
    ...metadata.value,
  },
  scheduleMode: 'day',
  dayGroups: dayGroups.value,
  weekGroups: weekGroups.value,
  dayGroupOrders: buildOrderEntries(dayGroups.value),
  weekGroupOrders: buildOrderEntries(weekGroups.value),
  exercises: workoutExercises.value,
}));

const sendAiSuggestion = async () => {
  const trimmedPrompt = aiPrompt.value.trim();
  if (!trimmedPrompt) {
    aiError.value = 'Please enter a short message before sending.';
    return;
  }

  aiLoading.value = true;
  aiError.value = '';
  aiResponse.value = '';

  try {
    const response = await fetch(`${API_BASE}/api/ai/qa-message`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmedPrompt }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || data?.detail || 'The AI request could not be completed.');
    }

    aiResponse.value = data?.response || 'The AI gateway returned an empty response.';
  } catch (error) {
    aiError.value = error?.message || 'Unable to complete the AI request.';
  } finally {
    aiLoading.value = false;
  }
};

const runGatewayDebugTest = async () => {
  aiError.value = '';
  aiResponse.value = '';
  gatewayTestLoading.value = true;

  try {
    const response = await fetch(`${API_BASE}/api/ai/qa-message`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' }),
    });

    const rawText = await response.text();
    let parsedBody = rawText;
    try {
      parsedBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsedBody = rawText;
    }

    if (!response.ok) {
      aiResponse.value = typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody, null, 2);
      return;
    }

    aiResponse.value = typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody, null, 2);
  } catch (error) {
    aiError.value = error?.message || 'Gateway test failed.';
    aiResponse.value = '';
  } finally {
    gatewayTestLoading.value = false;
  }
};

const requestDeleteDay = (dayName) => {
  dayToDelete.value = dayName;
  showDeleteModal.value = true;
};

const cancelDeleteDay = () => {
  showDeleteModal.value = false;
  dayToDelete.value = null;
};

const confirmDeleteDay = () => {
  if (!dayToDelete.value) {
    cancelDeleteDay();
    return;
  }
  removeScheduleGroup(dayToDelete.value);
  cancelDeleteDay();
};

const persistWorkout = async () => {
  saveMessage.value = '';

  if (!metadata.value.name.trim()) {
    saveMessage.value = 'Please enter a workout name.';
    return;
  }

  if (!userId.value) {
    saveMessage.value = 'Unable to resolve user session. Please login again.';
    return;
  }

  saving.value = true;

  try {
    const response = await fetch(`${API_BASE}/api/workout-planner`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planner: plannerPayload.value }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to save workout planner.');
    }

    const data = await response.json();
    syncWorkoutPlannerCapabilities(data);
    currentPlanId.value = String(data?.planner?.planId || currentPlanId.value || '').trim();
    selectedWorkoutId.value = currentPlanId.value;
    isCreatingWorkout.value = false;
    hasSavedWorkoutDetails.value = true;
    isSchedulePlannerOpen.value = true;
    syncWorkoutSchedules(data?.workoutLists);
    hasSavedWorkoutExerciseList.value = Boolean(data?.hasSavedWorkoutExerciseList);
    setUserWorkoutStatus(hasSavedWorkoutExerciseList.value);
    await refreshWorkoutStatus();
    saveMessage.value = 'Workout plan saved successfully.';
    await router.replace({ query: { ...route.query, planId: currentPlanId.value } });
  } catch (error) {
    saveMessage.value = error.message || 'Failed to save workout planner.';
  } finally {
    saving.value = false;
  }
};

const saveWorkout = async () => {
  await persistWorkout();
};

const handlePrimarySave = async () => {
  await saveWorkout();
};

const loadExercises = async () => {
  loadingExercises.value = true;
  try {
    const response = await fetch(`${API_BASE}/api/get-exercises`, {
      credentials: 'include',
    });
    const data = await response.json();
    allExercises.value = Array.isArray(data) ? data : [];
  } finally {
    loadingExercises.value = false;
  }
};

const loadUserId = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/session`, {
      credentials: 'include',
    });
    const data = await response.json();
    userId.value = data?.user?.id || null;
    const normalizedRole = String(data?.user?.role || data?.user?.roleSlug || '').trim().toLowerCase();
    isAdminUser.value = ['administrator', 'admin'].includes(normalizedRole);
    canCreateFeaturedPlans.value = isAdminUser.value || Boolean(data?.canCreateFeaturedPlans || data?.user?.canCreateFeaturedPlans);
  } catch {
    userId.value = null;
    isAdminUser.value = false;
    canCreateFeaturedPlans.value = false;
  }
};

const loadFeaturedWorkoutPlans = async () => {
  loadingFeaturedPlans.value = true;
  try {
    const response = await fetch(`${API_BASE}/api/featured-workout-plans`, {
      credentials: 'include',
    });

    if (!response.ok) {
      featuredWorkoutPlans.value = [];
      return;
    }

    const data = await response.json();
    featuredWorkoutPlans.value = Array.isArray(data?.workoutLists)
      ? data.workoutLists
          .filter((plan) => String(plan?.planType || '').trim().toLowerCase() === 'featured')
          .map((plan) => ({
            planId: String(plan?.planId || '').trim(),
            name: String(plan?.name || '').trim(),
            description: String(plan?.description || '').trim(),
            type: String(plan?.type || '').trim(),
            estimatedDuration: Number(plan?.estimatedDuration || 0),
            exerciseCount: Number(plan?.exerciseCount || 0),
          }))
      : [];
  } catch {
    featuredWorkoutPlans.value = [];
  } finally {
    loadingFeaturedPlans.value = false;
  }
};

const loadWorkoutPlanner = async (requestedPlanId = '') => {
  loadingPlanner.value = true;
  try {
    const query = requestedPlanId
      ? `?planId=${encodeURIComponent(String(requestedPlanId).trim())}`
      : '';

    const response = await fetch(`${API_BASE}/api/workout-planner${query}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    syncWorkoutPlannerCapabilities(data);
    syncWorkoutSchedules(data?.workoutLists);

    hasSavedWorkoutExerciseList.value = Boolean(data?.hasSavedWorkoutExerciseList);
    setUserWorkoutStatus(hasSavedWorkoutExerciseList.value);

    if (requestedPlanId) {
      const planner = data?.planner || {};
      selectedWorkoutId.value = String(planner?.planId || requestedPlanId).trim();
      isCreatingWorkout.value = false;
      const isPlannerReady = String(planner?.status || '').toLowerCase() !== 'draft';
      hydratePlanner(planner, { markSaved: isPlannerReady });
      return;
    }

    if (!workoutSchedules.value.length && !isCreatingWorkout.value) {
      selectedWorkoutId.value = '';
      hasSavedWorkoutDetails.value = false;
      resetPlannerDraft();
    }
  } catch (err) {
    console.error('Failed to load workout planner:', err);
  } finally {
    loadingPlanner.value = false;
  }
};

const selectWorkoutSchedule = async (schedule) => {
  const planId = String(schedule?.planId || '').trim();
  if (!planId) {
    return;
  }

  await router.replace({ query: { ...route.query, planId } });
  await loadWorkoutPlanner(planId);
};

const editWorkoutSchedule = async (schedule) => {
  await selectWorkoutSchedule(schedule);
  isWorkoutDetailsOpen.value = true;
};

const deleteWorkoutSchedule = async (schedule) => {
  const planId = String(schedule?.planId || '').trim();
  if (!planId) {
    return;
  }

  const planName = String(schedule?.name || 'this workout').trim();
  const confirmed = window.confirm(`Delete ${planName}? This will remove the saved workout schedule.`);
  if (!confirmed) {
    return;
  }

  deletingWorkoutId.value = planId;
  try {
    const response = await fetch(`${API_BASE}/api/workout-schedules/${encodeURIComponent(planId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to delete workout plan.');
    }

    const data = await response.json();
    syncWorkoutSchedules(data?.workoutLists);
    hasSavedWorkoutExerciseList.value = Boolean(data?.hasSavedWorkoutExerciseList);
    setUserWorkoutStatus(hasSavedWorkoutExerciseList.value);
    await refreshWorkoutStatus();

    if (selectedWorkoutId.value === planId) {
      await clearSelection();
    }

    saveMessage.value = 'Workout schedule deleted.';
  } catch (error) {
    saveMessage.value = error.message || 'Failed to delete workout schedule.';
  } finally {
    deletingWorkoutId.value = '';
  }
};

onMounted(async () => {
  const requestedPlanId = String(route.query?.planId || '').trim();
  await Promise.all([loadExercises(), loadUserId(), loadWorkoutPlanner(requestedPlanId), loadFeaturedWorkoutPlans()]);
  document.addEventListener('click', closeDayMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDayMenu);
});

watch(
  () => route.query?.planId,
  async (nextPlanId, prevPlanId) => {
    if (String(nextPlanId || '').trim() === String(prevPlanId || '').trim()) {
      return;
    }
    const normalizedNextPlanId = String(nextPlanId || '').trim();

    if (skipNextRoutePlannerLoad.value && normalizedNextPlanId === String(currentPlanId.value || '').trim()) {
      skipNextRoutePlannerLoad.value = false;
      return;
    }

    if (!normalizedNextPlanId) {
      if (!isCreatingWorkout.value) {
        selectedWorkoutId.value = '';
        hasSavedWorkoutDetails.value = false;
        resetPlannerDraft();
        await loadWorkoutPlanner('');
      }
      return;
    }

    await loadWorkoutPlanner(normalizedNextPlanId);
  }
);

watch(
  () => featuredWorkoutPlanSlides.value.length,
  (slideCount) => {
    if (!slideCount) {
      currentWorkoutPlanSlide.value = 0;
      selectedTemplatePlanId.value = '';
      selectedTemplatePlanName.value = '';
      return;
    }

    if (currentWorkoutPlanSlide.value > slideCount - 1) {
      currentWorkoutPlanSlide.value = 0;
    }
  }
);
</script>

<template>
  <div class="app-page-shell workout-builder-page">
    <div class="app-page-canvas app-inner-shell workout-builder-canvas">
      <section class="builder-hero ff-page-header app-header-gradient">
        <div>
          <h2>Workout Builder</h2>
          <p>Build sessions quickly with an athlete-first workflow.</p>
        </div>

      </section>

      <section class="main-builder-accordion" aria-label="Workout Builder main sections">
        <section class="main-builder-accordion__item" :class="{ open: mainAccordion.build }">
          <button
            type="button"
            class="main-builder-accordion__header"
            :aria-expanded="mainAccordion.build"
            @click="openMainAccordion('build')"
          >
            <span class="main-builder-accordion__title">Build a Plan</span>
            <span class="main-builder-accordion__icon" aria-hidden="true">
              <i class="fa-solid" :class="mainAccordion.build ? 'fa-minus' : 'fa-plus'"></i>
            </span>
          </button>
          <div v-show="mainAccordion.build" class="main-builder-accordion__body">

      <!-- ── Tab Bar ──────────────────────────────────────────── -->
      <nav class="builder-tabs" role="tablist" aria-label="Workout Builder sections">
        <button
          type="button"
          role="tab"
          :aria-selected="builderTab === 'select'"
          :class="['builder-tab', { 'builder-tab--active': builderTab === 'select' }]"
          @click="builderTab = 'select'"
        >
          <i class="fa-solid fa-list-check"></i>
          <span class="tab-label-full">Select a Workout Plan</span>
          <span class="tab-label-short">Select Plan</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="builderTab === 'create'"
          :class="['builder-tab', { 'builder-tab--active': builderTab === 'create' }]"
          @click="builderTab = 'create'; if (!canShowWorkoutDetails) { resetPlannerDraft(); }"
        >
          <i class="fa-solid fa-dumbbell"></i>
          <span class="tab-label-full">Create a Workout Plan</span>
          <span class="tab-label-short">Create Plan</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="builderTab === 'ai'"
          :class="['builder-tab', { 'builder-tab--active': builderTab === 'ai' }]"
          @click="builderTab = 'ai'"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span class="tab-label-full">Suggest with AI</span>
          <span class="tab-label-short">AI Suggest</span>
        </button>
      </nav>

      <!-- ── TAB 1: Select a Workout Plan ─────────────────────── -->
      <section v-show="builderTab === 'select'" class="builder-section schedule-hub-section">
        <div v-if="loadingFeaturedPlans" class="builder-empty planner-empty planner-empty--loading" aria-live="polite">
          <div class="planner-empty__icon">📋</div>
          <h4>Loading Featured Workout Plans</h4>
          <p>Pulling the latest featured plans from the database.</p>
        </div>

        <div v-else-if="!hasFeaturedWorkoutPlans" class="builder-empty planner-empty" aria-live="polite">
          <div class="planner-empty__icon">📭</div>
          <h4>No Featured Workout Plans Available</h4>
          <p>Ask an administrator to publish a Featured plan to populate this section.</p>
        </div>

        <div v-else class="plan-carousel" aria-live="polite">
          <div class="plan-carousel__header">
            <h4>{{ activeWorkoutPlanSlide.title }}</h4>
            <span class="plan-carousel__position">
              Slide {{ currentWorkoutPlanSlide + 1 }} of {{ featuredWorkoutPlanSlides.length }}
            </span>
          </div>

          <div class="plan-carousel__body" role="group" :aria-label="`${activeWorkoutPlanSlide.title} workout plans`">
            <button
              v-for="plan in activeWorkoutPlanSlide.plans"
              :key="`${activeWorkoutPlanSlide.title}-${plan.planId || plan.name}`"
              type="button"
              :class="['plan-carousel__item', { 'plan-carousel__item--selected': selectedTemplatePlanId === plan.planId }]"
              :disabled="cloningFeaturedPlanId === plan.planId"
              @click="selectTemplatePlan(plan)"
            >
              <span class="plan-carousel__item-content">
                <span class="plan-carousel__item-name">{{ plan.name }}</span>
                <small class="plan-carousel__item-description">{{ plan.description || 'No description provided.' }}</small>
              </span>
              <small class="plan-carousel__item-meta">
                {{ plan.estimatedDuration }} min • {{ plan.exerciseCount }} exercises
              </small>
            </button>
          </div>

          <div class="plan-carousel__footer">
            <button
              v-if="hasMultipleFeaturedWorkoutPlanSlides"
              type="button"
              class="plan-carousel__nav"
              @click="goToPreviousWorkoutPlanSlide"
            >
              Previous
            </button>

            <div
              v-if="hasMultipleFeaturedWorkoutPlanSlides"
              class="plan-carousel__dots"
              role="tablist"
              aria-label="Workout plan slides"
            >
              <button
                v-for="(slide, index) in featuredWorkoutPlanSlides"
                :key="slide.title"
                type="button"
                role="tab"
                :aria-selected="currentWorkoutPlanSlide === index"
                :aria-label="`Go to ${slide.title}`"
                :class="['plan-carousel__dot', { 'plan-carousel__dot--active': currentWorkoutPlanSlide === index }]"
                @click="setWorkoutPlanSlide(index)"
              ></button>
            </div>

            <button
              v-if="hasMultipleFeaturedWorkoutPlanSlides"
              type="button"
              class="plan-carousel__nav"
              @click="goToNextWorkoutPlanSlide"
            >
              Next
            </button>
          </div>

          <p class="plan-carousel__selected">
            Selected Plan:
            <strong>{{ selectedTemplatePlanName || 'None' }}</strong>
          </p>
        </div>
      </section>

      <!-- ── TAB 2: Create a Workout Plan ───────────────────────── -->
      <section v-show="builderTab === 'create'" class="builder-section collapsible-panel">
        <div v-if="!canShowWorkoutDetails" class="builder-empty planner-empty" aria-live="polite">
          <div class="planner-empty__icon">📝</div>
          <h4>No plan selected</h4>
          <p>Start a new plan or select an existing one from the Select tab.</p>
          <button type="button" class="btn-create-plan" style="margin-top:8px" @click="createWorkoutPlan" :disabled="loadingPlanner">
            {{ loadingPlanner ? 'Creating...' : 'Start New Workout Plan' }}
          </button>
        </div>
        <div v-else>
          <div class="collapsible-header" style="cursor:default; margin-bottom:0;">
            <span class="collapsible-header__text">
              <strong>Workout Plan Details</strong>
              <small>Plan name, description, type, duration, and goals.</small>
            </span>
          </div>
          <div class="collapsible-panel__body">
            <WorkoutMetadataForm
              :metadata="metadata"
              :can-create-featured-plans="canCreateFeaturedPlans"
              @update:metadata="metadata = $event"
            />
          </div>

          <section class="planner-shell">
          <div class="planner-heading-group planner-heading-group--combined">
            <h3>Schedule Planner</h3>
            <p>Manage workout days and assign exercises.</p>
          </div>
          <div class="planner-tools">
              <div class="planner-group-editor">
                <input
                  v-model="newScheduleGroupName"
                  type="text"
                  placeholder="Add Day (e.g. Day 1)"
                />
                <button
                  type="button"
                  class="planner-group-add"
                  @click="addScheduleGroup"
                >
                  Add Day
                </button>
              </div>

              <div class="workout-day-accordion" role="list" aria-label="Workout days">
                <transition-group name="day-order" tag="div" class="workout-day-accordion__list">
                  <div
                    v-for="day in workoutDaysWithExercises"
                    :key="day.name"
                    :class="['workout-day-card', { active: selectedScheduleGroup === day.name, 'is-menu-open': openMenuDay === day.name }]"
                    role="listitem"
                  >
                    <div
                      class="workout-day-header"
                      role="button"
                      tabindex="0"
                      @click="setActiveDay(day.name)"
                      @keydown.enter.prevent="setActiveDay(day.name)"
                      @keydown.space.prevent="setActiveDay(day.name)"
                    >
                      <div class="day-title-group day-title-edit-wrap" @click.stop>
                        <input
                          v-if="inlineEditingDayName === day.name"
                          v-model="inlineDayNameDraft"
                          class="day-title-inline-input"
                          type="text"
                          maxlength="40"
                          @keydown.enter.prevent="saveInlineDayNameEdit"
                          @blur="saveInlineDayNameEdit"
                        />
                        <strong
                          v-else
                          class="day-title-editable"
                          title="Click to rename"
                          @click="startInlineDayNameEdit(day.name)"
                        >
                          {{ day.name }}
                        </strong>
                        <span v-if="day.exerciseCount > 0" class="exercise-count">{{ day.exerciseCount }} exercise{{ day.exerciseCount === 1 ? '' : 's' }}</span>
                      </div>

                      <div class="day-header-actions" @click.stop>
                        <button type="button" class="btn-add-exercise-day" @click="setActiveDay(day.name); openPicker()">
                          <span class="btn-add-exercise__icon">＋</span>
                          <span>Add Exercise</span>
                        </button>
                      </div>

                      <div class="day-kebab-wrap" @click.stop>
                        <button
                          type="button"
                          class="day-kebab-btn"
                          :aria-expanded="openMenuDay === day.name"
                          @click.stop="toggleDayMenu(day.name, $event)"
                        >
                          <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div
                          v-if="openMenuDay === day.name"
                          :class="['day-kebab-menu', `day-kebab-menu--${openMenuPlacement}`]"
                        >
                          <button
                            type="button"
                            class="day-kebab-item"
                            @click="duplicateScheduleGroup(day.name); openMenuDay = null"
                          >
                            <i class="fa-solid fa-copy"></i>
                            Duplicate Day
                          </button>
                          <button
                            v-if="hasMultipleScheduleGroups && !isFirstScheduleGroup(day.name)"
                            type="button"
                            class="day-kebab-item"
                            @click="moveScheduleGroupUp(day.name); openMenuDay = null"
                          >
                            <i class="fa-solid fa-arrow-up"></i>
                            Move Up
                          </button>
                          <button
                            v-if="hasMultipleScheduleGroups && !isLastScheduleGroup(day.name)"
                            type="button"
                            class="day-kebab-item"
                            @click="moveScheduleGroupDown(day.name); openMenuDay = null"
                          >
                            <i class="fa-solid fa-arrow-down"></i>
                            Move Down
                          </button>
                          <button
                            v-if="canRemoveScheduleGroup(day.name)"
                            type="button"
                            class="day-kebab-item day-kebab-item--delete"
                            @click="requestDeleteDay(day.name); openMenuDay = null"
                          >
                            <i class="fa-solid fa-trash"></i>
                            Delete Day
                          </button>
                        </div>
                      </div>
                    </div>

                    <transition name="accordion-slide">
                      <div v-if="selectedScheduleGroup === day.name" class="workout-day-panel">
                        <div v-if="day.exercises.length > 0" class="day-exercises-list">
                          <WorkoutExerciseBlock
                            v-for="(exercise, idx) in day.exercises"
                            :key="exercise.id"
                            :exercise="exercise"
                            :index="workoutExercises.findIndex(ex => ex.id === exercise.id)"
                            :total="workoutExercises.length"
                            :schedule-groups="activeGroups"
                            :schedule-mode="scheduleMode"
                            @update-field="updateExerciseField"
                            @remove="removeExercise"
                            @move-up="moveExerciseUp"
                            @move-down="moveExerciseDown"
                          />
                        </div>

                        <div v-else class="empty-day-state">
                          <p>No exercises yet. Add an exercise to begin.</p>
                        </div>
                      </div>
                    </transition>
                  </div>
                </transition-group>
              </div>

              <p v-if="plannerMessage" class="planner-feedback planner-feedback--error">
                {{ plannerMessage }}
              </p>

              <div v-if="activeGroups.length === 0" class="planner-helper-text">
                No workout days added yet.
              </div>
            </div>

            <div v-if="loadingExercises" class="builder-empty planner-empty planner-empty--loading" aria-live="polite">
              <div class="planner-empty__icon">⏳</div>
              <h4>Loading exercise library</h4>
              <p>Pulling your exercise catalog now. This will only take a moment.</p>
            </div>

            <div v-else-if="loadingPlanner" class="builder-empty planner-empty planner-empty--loading" aria-live="polite">
              <div class="planner-empty__icon">📦</div>
              <h4>Loading saved planner</h4>
              <p>Fetching your saved workout schedule from your profile settings.</p>
            </div>

          </section>
        </div>
      </section>

      <footer v-if="showSaveFooter" class="builder-footer">
        <p
          v-if="saveMessage"
          :class="[
            'save-message',
            /failed|please|unable/i.test(saveMessage) ? 'err' : 'ok',
          ]"
        >
          {{ saveMessage }}
        </p>
        <button type="button" class="btn-save" :disabled="saving" @click="handlePrimarySave">
          {{ primarySaveLabel }}
        </button>
      </footer>

      <!-- ── TAB 3: Suggest with AI ─────────────────────────────── -->
      <section v-show="builderTab === 'ai'" class="builder-section ai-suggest-section">
        <div v-if="!isAdminUser" class="ai-suggest-body planner-empty">
          <div class="planner-empty__icon">🔒</div>
          <h4>Administrator access required</h4>
          <p>This AI tab is currently limited to administrators so the foundation stays secure and scoped.</p>
        </div>

        <div v-else class="ai-suggest-body ai-suggest-card">
          <div class="planner-empty__icon">🤖</div>
          <h4>Suggest with AI</h4>
          <p>Send a short prompt to the backend and receive a response from the AI gateway foundation.</p>

          <label class="ai-prompt-label" for="ai-prompt-input">Message</label>
          <textarea
            id="ai-prompt-input"
            v-model="aiPrompt"
            rows="4"
            maxlength="280"
            placeholder="Example: Suggest a simple beginner upper-body workout."
            class="ai-prompt-input"
          ></textarea>

          <div class="ai-actions">
            <button type="button" class="ai-generate-btn" :disabled="aiLoading" @click="sendAiSuggestion">
              {{ aiLoading ? 'Sending...' : 'Send' }}
            </button>
            <button type="button" class="ai-generate-btn ai-test-btn" :disabled="aiLoading || gatewayTestLoading" @click="runGatewayDebugTest">
              {{ gatewayTestLoading ? 'Testing...' : 'TEST GATEWAY' }}
            </button>
          </div>

          <div v-if="aiError" class="ai-feedback ai-feedback--error">{{ aiError }}</div>
          <div v-else-if="aiResponse" class="ai-feedback ai-feedback--success">{{ aiResponse }}</div>
          <div v-else class="ai-feedback ai-feedback--hint">Your response will appear here once the request completes.</div>
        </div>
      </section>
          </div>
        </section>

        <section class="main-builder-accordion__item" :class="{ open: mainAccordion.existing }">
          <button
            type="button"
            class="main-builder-accordion__header"
            :aria-expanded="mainAccordion.existing"
            @click="openMainAccordion('existing')"
          >
            <span class="main-builder-accordion__title">Show Existing Plans</span>
            <span class="main-builder-accordion__icon" aria-hidden="true">
              <i class="fa-solid" :class="mainAccordion.existing ? 'fa-minus' : 'fa-plus'"></i>
            </span>
          </button>
          <div v-show="mainAccordion.existing" class="main-builder-accordion__body">
            <div class="existing-plans-panel" aria-live="polite">
              <div class="existing-plans-panel__head">
                <h4>Saved Workout Plans</h4>
                <p>Plan Name, Duration, Exercise Count, and quick actions.</p>
              </div>

              <div v-if="loadingPlanner" class="builder-empty planner-empty planner-empty--loading">
                <div class="planner-empty__icon">📋</div>
                <h4>Loading existing plans</h4>
                <p>Fetching your saved workout plans from the current database.</p>
              </div>

              <div v-else-if="!hasWorkoutSchedules" class="builder-empty schedule-hub-empty">
                <div class="planner-empty__icon">🗂️</div>
                <h4>No saved plans yet</h4>
                <p>Create a new plan using Add New Plan, then save it to see it here.</p>
              </div>

              <div v-else class="schedule-hub-list">
                <WorkoutScheduleListItem
                  v-for="schedule in workoutSchedules"
                  :key="schedule.planId"
                  :schedule="schedule"
                  :selected="selectedWorkoutId === schedule.planId"
                  :deleting="deletingWorkoutId === schedule.planId"
                  @open="selectWorkoutSchedule"
                  @edit="editWorkoutSchedule"
                  @delete="deleteWorkoutSchedule"
                />
              </div>
            </div>
          </div>
        </section>
      </section>

    <ExercisePickerModal
      :is-open="pickerOpen"
      :exercises="allExercises"
      :user-id="userId"
      @close="closePicker"
      @add="addExerciseToWorkout"
    />

    <!-- Delete Day Confirmation Modal -->
    <transition name="modal-fade">
      <div v-if="showDeleteModal" class="delete-modal-backdrop" @click.self="cancelDeleteDay">
        <div class="delete-modal">
          <div class="delete-modal__header">
            <h3>Delete Workout Day?</h3>
          </div>
          <div class="delete-modal__body">
            <p>
              Are you sure you want to delete <strong>{{ dayToDelete }}</strong>?
              This will also delete all exercises assigned to that day.
            </p>
          </div>
          <div class="delete-modal__actions">
            <button type="button" class="modal-btn modal-btn--cancel" @click="cancelDeleteDay">
              Cancel
            </button>
            <button type="button" class="modal-btn modal-btn--delete" @click="confirmDeleteDay">
              Delete Day
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
  </div>
</template>

<style scoped>
.workout-builder-page { display: block; }

.workout-builder-canvas {
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

/* ── Tab Bar ──────────────────────────────────────────────────── */
.builder-tabs {
  display: flex;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 5px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.builder-tab {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 7px;
  min-height: 42px;
  padding: 0 10px;
  font-weight: 700;
  font-size: 0.86rem;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
  white-space: nowrap;
  min-width: 0;
  text-align: center;
}

.builder-tab i {
  font-size: 0.82rem;
}

.builder-tab:hover:not(:disabled) {
  background: #f1f5f9;
  color: #1e293b;
}

.builder-tab--active {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.builder-tab--active:hover {
  background: #1d4ed8;
  color: #ffffff;
}

.builder-tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.builder-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.builder-hero h2 {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.builder-hero p {
  margin: 8px 0 0;
  color: #cbd5e1;
  font-size: 0.92rem;
}

.builder-hero__stats {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.builder-hero__stats div {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 10px 10px;
  display: grid;
  gap: 4px;
  background: rgba(255, 255, 255, 0.08);
}

.builder-hero__stats strong {
  font-size: 1.1rem;
  line-height: 1;
}

.builder-hero__stats span {
  font-size: 0.76rem;
  color: #cbd5e1;
}

.builder-section {
  background: #ffffff;
  border: 1px solid #e5ecf5;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.045);
}

.main-builder-accordion {
  width: 100%;
  display: grid;
  gap: 12px;
  min-width: 0;
}

.main-builder-accordion__item {
  width: 100%;
  border: 1px solid #dbe4ef;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
  min-width: 0;
  box-sizing: border-box;
}

.main-builder-accordion__item.open {
  border-color: #2563eb;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
}

.main-builder-accordion__header {
  width: 100%;
  border: none;
  background: #f8fafc;
  color: #0f172a;
  min-height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-weight: 800;
  text-align: left;
}

.main-builder-accordion__header:hover {
  background: #f1f5f9;
}

.main-builder-accordion__title {
  font-size: 0.97rem;
}

.main-builder-accordion__icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #334155;
  flex: 0 0 auto;
}

.main-builder-accordion__body {
  padding: 12px;
  min-width: 0;
  overflow-x: hidden;
  box-sizing: border-box;
}

.main-builder-accordion__body > .builder-tabs {
  margin-bottom: 10px;
}

.main-builder-accordion__body > .builder-section {
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 2px 0 0;
  background: transparent;
}

.main-builder-accordion__body > .existing-plans-panel {
  width: 100%;
  min-width: 0;
}

.collapsible-panel {
  padding: 16px;
}

.schedule-hub-head__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.schedule-hub-list {
  display: grid;
  gap: 12px;
}

.select-plan-accordion {
  display: grid;
  gap: 10px;
}

.select-plan-accordion__item {
  border: 1px solid #dbe4ef;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
}

.select-plan-accordion__item.open {
  border-color: #2563eb;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
}

.select-plan-accordion__header {
  width: 100%;
  border: none;
  background: #f8fafc;
  color: #0f172a;
  min-height: 52px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-weight: 800;
  text-align: left;
}

.select-plan-accordion__header:hover {
  background: #f1f5f9;
}

.select-plan-accordion__title {
  font-size: 0.95rem;
}

.select-plan-accordion__icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #334155;
  flex: 0 0 auto;
}

.select-plan-accordion__body {
  padding: 12px;
  min-width: 0;
}

.existing-plans-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.existing-plans-panel__head h4 {
  margin: 0;
  color: #0f172a;
  font-size: 1.02rem;
  font-weight: 800;
}

.existing-plans-panel__head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.86rem;
}

.plan-carousel {
  border: 1px solid #dce5f3;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f7fbff 100%);
  padding: 18px;
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.plan-carousel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.plan-carousel__header h4 {
  margin: 0;
  color: #0f172a;
  font-size: 1.04rem;
  font-weight: 800;
}

.plan-carousel__position {
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 700;
}

.plan-carousel__body {
  display: grid;
  gap: 12px;
}

.plan-carousel__item {
  width: 100%;
  display: block;
  appearance: none;
  text-align: left;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.9rem;
  font-weight: 600;
  min-height: 44px;
  padding: 0 16px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.plan-carousel__item:disabled {
  opacity: 0.75;
  cursor: wait;
}

.plan-carousel__item-content {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.plan-carousel__item-name {
  display: inline-block;
  text-align: left;
}

.plan-carousel__item-description {
  display: inline-block;
  text-align: left;
  font-size: 0.78rem;
  color: #64748b;
  white-space: normal;
}

.plan-carousel__item-meta {
  display: inline-block;
  font-size: 0.74rem;
  font-weight: 700;
  opacity: 0.72;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.plan-carousel__item:hover {
  background: #f8fbff;
  border-color: #93c5fd;
}

.plan-carousel__item--selected {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.22);
}

.plan-carousel__footer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.plan-carousel__nav {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  min-height: 34px;
  padding: 0 10px;
  background: #ffffff;
  color: #334155;
  font-weight: 600;
  font-size: 0.8rem;
  transition: background 0.18s ease, border-color 0.18s ease;
  white-space: nowrap;
}

.plan-carousel__nav:hover {
  background: #f8fafc;
  border-color: #93c5fd;
}

.plan-carousel__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.plan-carousel__dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  border: 1px solid #94a3b8;
  background: #e2e8f0;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.plan-carousel__dot:hover {
  transform: scale(1.1);
}

.plan-carousel__dot--active {
  background: #2563eb;
  border-color: #2563eb;
  transform: scale(1.1);
}

.plan-carousel__selected {
  margin: 0;
  font-size: 0.9rem;
  color: #475569;
  font-weight: 600;
  padding-top: 2px;
}

.plan-carousel__selected strong {
  color: #0f172a;
  margin-left: 4px;
}

.schedule-hub-empty {
  border-style: solid;
  background: linear-gradient(180deg, #fbfdff 0%, #f8fafc 100%);
  gap: 12px;
}

.schedule-hub-empty__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-create-plan,
.btn-ai-suggest {
  border-radius: 12px;
  min-height: 46px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 0.88rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.btn-create-plan {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
}

.btn-create-plan:hover {
  transform: translateY(-1px);
  background: #1d4ed8;
}

.btn-ai-suggest {
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #fff;
  box-shadow: 0 8px 18px rgba(220, 38, 38, 0.18);
}

.btn-ai-suggest:hover {
  transform: translateY(-1px);
  background: #b91c1c;
}

.collapsible-header {
  width: 100%;
  border: 1px solid #e6ebf3;
  background: #f8fafc;
  border-radius: 14px;
  padding: 14px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.collapsible-header:hover {
  background: #f1f5f9;
  border-color: #dbe4ef;
}

.collapsible-header__text {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.collapsible-header__text strong {
  color: #0f172a;
  font-size: 1.02rem;
  font-weight: 800;
  letter-spacing: -0.012em;
}

.collapsible-header__text small {
  color: #64748b;
  font-size: 0.84rem;
}

.collapsible-header__icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e2e8f0;
  color: #1e293b;
  flex: 0 0 auto;
  transition: transform 0.2s ease;
}

.collapsible-header__icon.open {
  transform: rotate(180deg);
}

.collapsible-panel__body {
  margin-top: 20px;
}

.panel-collapse-enter-active,
.panel-collapse-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.panel-collapse-enter-from,
.panel-collapse-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.planner-section {
  border: 1px solid #dfe7f2;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
  padding: 16px;
}

.planner-panel-head {
  cursor: pointer;
  margin-bottom: 0;
  border: 1px solid #e5ebf4;
  border-radius: 14px;
  padding: 14px;
  background: #f8fafc;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.planner-panel-head:hover {
  background: #f1f5f9;
  border-color: #dbe4ef;
}

.planner-head-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.planner-heading-group {
  min-width: 0;
}

.planner-heading-group h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.planner-heading-group p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.85rem;
}

.planner-shell {
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #f8fafc;
  padding: 12px;
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.planner-tools {
  display: grid;
  gap: 10px;
  margin-bottom: 8px;
  min-width: 0;
}

.planner-mode-toggle {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #f8fafc;
  padding: 4px;
  gap: 6px;
  min-width: 0;
  box-sizing: border-box;
}

.planner-mode-btn {
  border: none;
  background: transparent;
  color: #334155;
  border-radius: 9px;
  min-height: 40px;
  padding: 8px 10px;
  font-weight: 700;
  font-size: 0.88rem;
}

.planner-mode-btn.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.planner-group-editor {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  min-width: 0;
}

.planner-feedback {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
}

.planner-feedback--error {
  color: #b91c1c;
}

.planner-group-editor input {
  border: 1px solid #d6dee9;
  border-radius: 12px;
  min-height: 46px;
  padding: 11px 12px;
  background: #f8fafc;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.planner-group-add {
  border: 1px solid #1d4ed8;
  border-radius: 12px;
  min-height: 46px;
  padding: 0 14px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
}

.planner-group-save {
  border: 1px solid #059669;
  border-radius: 12px;
  min-height: 46px;
  padding: 0 14px;
  background: #059669;
  color: #fff;
  font-weight: 700;
}

.planner-helper-text {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 0.88rem;
  font-weight: 600;
  margin-top: 12px;
}

.planner-helper-text i {
  font-size: 14px;
}

/* Workout Day Accordion System */
.workout-day-accordion {
  display: grid;
  gap: 10px;
}

.workout-day-accordion__list {
  display: grid;
  gap: 10px;
}

.workout-day-card {
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  background: #ffffff;
  overflow: visible;
  transition: all 0.2s ease;
  min-width: 0;
  box-sizing: border-box;
  position: relative;
  z-index: 0;
}

.workout-day-card.active {
  border-color: #2563eb;
  background: #f8fbff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.10);
}

.workout-day-card.is-menu-open {
  z-index: 25;
}

.workout-day-header {
  width: 100%;
  border: none;
  background: transparent;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  min-width: 0;
  box-sizing: border-box;
}

.workout-day-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.workout-day-card.active .workout-day-header {
  background: transparent;
}

.day-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}

.day-title-group strong {
  font-size: 0.96rem;
  font-weight: 700;
  color: #0f172a;
}

.day-title-editable {
  cursor: text;
  border-radius: 7px;
  padding: 2px 6px;
  margin-left: -6px;
  transition: background-color 0.15s ease;
}

.day-title-editable:hover {
  background: #eef2ff;
}

.day-title-inline-input {
  min-width: 132px;
  max-width: 220px;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  min-height: 30px;
  padding: 4px 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  background: #ffffff;
}

.day-title-inline-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
}

.selected-badge {
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.exercise-count {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.day-header-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.day-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.day-action-btn {
  border-radius: 7px;
  min-height: 30px;
  padding: 0 9px;
  font-size: 0.76rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.day-action-btn--secondary {
  min-height: 28px;
  padding: 0 8px;
  font-size: 0.73rem;
}

.day-action-btn--select {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
}

.day-action-btn--select:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.day-action-btn--selected {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
  cursor: default;
}

.day-action-btn--selected:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.day-action-btn--move {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
}

.day-action-btn--move:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f1f5f9;
}

.day-action-btn--reset {
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.day-action-btn--reset:hover:not(:disabled) {
  border-color: #facc15;
  background: #fef3c7;
}

.day-action-btn--edit {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.day-action-btn--edit:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.day-action-btn--delete {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.day-action-btn--delete:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #fca5a5;
}

.day-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chevron-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  display: grid;
  place-items: center;
  transition: all 0.2s ease;
}

.chevron-btn:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.workout-day-card.active .chevron-btn {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

/* ── Kebab menu (mobile only) ── */
.day-kebab-wrap {
  position: relative;
  display: flex;
  flex-shrink: 0;
  z-index: 2;
}

.day-kebab-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.15s;
}
.day-kebab-btn:hover {
  background: #f1f5f9;
}

.day-kebab-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  min-width: 162px;
  width: max-content;
  max-width: min(240px, calc(100vw - 20px));
  z-index: 1000;
  overflow: hidden;
  white-space: nowrap;
}

.day-kebab-menu--up {
  top: auto;
  bottom: calc(100% + 8px);
}

.day-kebab-item {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: transparent;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.day-kebab-item:last-child {
  border-bottom: none;
}
.day-kebab-item:hover {
  background: #f8fafc;
}
.day-kebab-item i {
  width: 16px;
  text-align: center;
  color: #64748b;
}
.day-kebab-item--delete {
  color: #dc2626;
}
.day-kebab-item--delete i {
  color: #dc2626;
}
.day-kebab-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.workout-day-panel {
  background: transparent;
  border-top: 1px solid #dbe4f0;
  padding: 8px 10px 10px;
  min-width: 0;
  box-sizing: border-box;
}

.workout-day-card.active .workout-day-panel {
  background: transparent;
}

.day-exercises-list {
  display: grid;
  gap: 10px;
  margin-bottom: 8px;
}

.empty-day-state {
  border: 1px dashed #c7d2e3;
  border-radius: 8px;
  padding: 8px 10px;
  text-align: left;
  background: #f8fafc;
}

.empty-day-state p {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
}

.btn-add-exercise-day {
  border: 1px solid #1d4ed8;
  border-radius: 9px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  padding: 0 12px;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.18);
  transition: all 0.2s ease;
  font-size: 0.78rem;
}

.day-order-move,
.day-order-enter-active,
.day-order-leave-active {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.day-order-enter-from,
.day-order-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.day-order-leave-active {
  position: absolute;
  width: calc(100% - 2px);
}

.btn-add-exercise-day:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.24);
  background: #1d4ed8;
}

.btn-add-exercise-day .btn-add-exercise__icon {
  font-size: 1rem;
  line-height: 1;
}

/* Accordion slide animation */
.accordion-slide-enter-active,
.accordion-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}

.accordion-slide-enter-from,
.accordion-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* Delete Modal */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.delete-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.delete-modal {
  width: min(420px, 100%);
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.delete-modal__header {
  padding: 20px 22px 12px;
  border-bottom: 1px solid #e5e7eb;
}

.delete-modal__header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
}

.delete-modal__body {
  padding: 20px 22px;
}

.delete-modal__body p {
  margin: 0;
  color: #475569;
  font-size: 0.94rem;
  line-height: 1.6;
}

.delete-modal__body strong {
  color: #0f172a;
  font-weight: 700;
}

.delete-modal__actions {
  padding: 16px 22px 20px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-btn {
  border-radius: 10px;
  min-height: 42px;
  padding: 0 20px;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.modal-btn--cancel {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
}

.modal-btn--cancel:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.modal-btn--delete {
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
}

.modal-btn--delete:hover {
  background: #b91c1c;
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3);
}

/* Responsive adjustments */
@media (max-width: 639px) {
  .workout-builder-page :deep(input),
  .workout-builder-page :deep(select),
  .workout-builder-page :deep(textarea),
  .workout-builder-page .planner-group-editor input {
    font-size: 16px;
  }
}

.builder-section__head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.02rem;
}

.builder-section__head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.86rem;
}

.builder-section__head--inline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.btn-add-exercise {
  width: 100%;
  border: 1px solid #10b981;
  border-radius: 12px;
  background: #059669;
  color: #fff;
  font-weight: 700;
  padding: 12px 16px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 8px 18px rgba(5, 150, 105, 0.2);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.btn-add-exercise:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(5, 150, 105, 0.28);
}

.btn-add-exercise__icon {
  font-size: 1rem;
  line-height: 1;
}

.builder-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: #64748b;
}

.planner-empty {
  border: 1px solid #dce5f3;
  border-radius: 16px;
  background: linear-gradient(180deg, #f8fbff 0%, #f7fafc 100%);
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 28px 18px;
  min-height: 180px;
}

.planner-empty--loading {
  border-color: #cbd5e1;
}

.planner-empty__icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e2e8f0;
  font-size: 1.35rem;
}

.planner-empty h4 {
  margin: 4px 0 0;
  color: #0f172a;
}

.planner-empty p {
  margin: 0;
  max-width: 420px;
  color: #64748b;
  font-size: 0.92rem;
}

.planner-empty--compact {
  padding: 14px;
  border-radius: 10px;
}

.btn-add-exercise--empty {
  margin-top: 8px;
  width: 100%;
  max-width: 260px;
}

.planner-content {
  display: grid;
  gap: 12px;
}

.planner-group-card {
  border: 1px solid #d6e0ee;
  border-radius: 14px;
  background: #fff;
  padding: 12px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
}

.planner-group-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.planner-group-card__head h4 {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
}

.planner-group-card__head p {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 0.84rem;
}

.planner-remove-group {
  border: 1px solid #fecaca;
  border-radius: 10px;
  min-height: 36px;
  padding: 0 10px;
  background: #fff1f2;
  color: #b91c1c;
  font-weight: 600;
}

.planner-remove-group:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.planner-group-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  color: #64748b;
  font-size: 0.88rem;
  background: #f8fafc;
}

.builder-footer {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e8edf4;
  border-radius: 14px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  min-width: 0;
  box-sizing: border-box;
  margin-top: 0;
  width: 100%;
}

.save-message {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.save-message.ok {
  color: #166534;
}

.save-message.err {
  color: #b91c1c;
}

.btn-save {
  width: 100%;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  padding: 12px 18px;
  min-height: 48px;
}

.btn-save:disabled {
  opacity: 0.55;
}

/* ── 0.84.39 Workout Builder dark-theme normalization (scoped) ─────────── */
.workout-builder-page {
  --wb-surface-1: var(--wa-shell-surface, #121923);
  --wb-surface-2: var(--wa-shell-surface-elevated, #17212d);
  --wb-surface-3: var(--wa-shell-surface-soft, #1d2a38);
  --wb-border: var(--wa-shell-border, rgba(120, 145, 175, 0.16));
  --wb-border-strong: var(--wa-shell-border-strong, rgba(120, 145, 175, 0.28));
/* Tab Bar */
  --wb-text: var(--wa-shell-text, #f8fafc);
  --wb-text-secondary: var(--wa-shell-text-secondary, #a4b0c0);
  --wb-text-muted: var(--wa-shell-text-muted, #738196);
  --wb-accent: var(--wa-shell-accent, var(--main-color, #3b82f6));
}

.workout-builder-page .builder-hero.ff-page-header.app-header-gradient {
  background: linear-gradient(135deg, #0f2561 0%, #112463 42%, #1b2444 100%) !important;
  border: 1px solid var(--wb-border);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.workout-builder-page .builder-hero h2,
.workout-builder-page .builder-section__head h3,
.workout-builder-page .planner-heading-group h3,
.workout-builder-page .day-title-group strong,
.workout-builder-page .collapsible-header__text strong {
  color: var(--wb-text);
}

.workout-builder-page .builder-hero p,
.workout-builder-page .builder-section__head p,
.workout-builder-page .planner-heading-group p,
.workout-builder-page .exercise-count,
.workout-builder-page .collapsible-header__text small {
  color: var(--wb-text-secondary);
}

.workout-builder-page .builder-hero__stats div {
  background: rgba(15, 23, 35, 0.74);
  border: 1px solid var(--wb-border);
}

.workout-builder-page .builder-hero__stats strong {
  color: var(--wb-text);
}

.workout-builder-page .builder-hero__stats span {
  color: var(--wb-text-secondary);
}

.workout-builder-page .builder-tabs {
  background: var(--wb-surface-1);
  border-color: var(--wb-border);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.workout-builder-page .builder-tab {
  color: var(--wb-text-muted);
  border-radius: 7px;
}

.workout-builder-page .builder-tab:hover:not(:disabled) {
  background: var(--wb-surface-2);
  color: var(--wb-text);
}

.workout-builder-page .plan-carousel__item {
  border-radius: 10px !important;
}

.workout-builder-page .builder-tab--active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--wb-accent) 85%, #1e40af 15%), color-mix(in srgb, var(--wb-accent) 70%, #1d4ed8 30%));
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.28);
}

.workout-builder-page .builder-tab:disabled {
  opacity: 0.5;
}

.workout-builder-page .builder-section,
.workout-builder-page .planner-section,
.workout-builder-page .collapsible-panel,
.workout-builder-page .ai-suggest-section,
.workout-builder-page .plan-carousel,
.workout-builder-page .planner-shell,
.workout-builder-page .main-builder-accordion__item,
.workout-builder-page .main-builder-accordion__header,
.workout-builder-page .main-builder-accordion__icon,
.workout-builder-page .main-builder-accordion__body,
.workout-builder-page .select-plan-accordion__item,
.workout-builder-page .select-plan-accordion__header,
.workout-builder-page .select-plan-accordion__icon,
.workout-builder-page .builder-footer,
.workout-builder-page .planner-empty,
.workout-builder-page .builder-empty,
.workout-builder-page .schedule-hub-empty,
.workout-builder-page .workout-day-card,
.workout-builder-page .workout-day-panel,
.workout-builder-page .collapsible-header,
.workout-builder-page .planner-mode-toggle,
.workout-builder-page .planner-group-editor input,
.workout-builder-page .planner-helper-text,
.workout-builder-page .delete-modal {
  background: var(--wb-surface-1);
  border-color: var(--wb-border);
  color: var(--wb-text);
}

.workout-builder-page .collapsible-header,
.workout-builder-page .planner-mode-toggle,
.workout-builder-page .workout-day-card.active,
.workout-builder-page .workout-day-header:hover,
.workout-builder-page .planner-helper-text,
.workout-builder-page .builder-footer {
  background: var(--wb-surface-2);
}

.workout-builder-page .main-builder-accordion__header:hover {
  background: var(--wb-surface-3);
}

.workout-builder-page .planner-empty__icon,
.workout-builder-page .collapsible-header__icon,
.workout-builder-page .chevron-btn {
  background: var(--wb-surface-3);
  border-color: var(--wb-border);
  color: var(--wb-text-secondary);
}

.workout-builder-page .planner-empty h4,
.workout-builder-page .save-message,
.workout-builder-page .planner-group-editor input,
.workout-builder-page .planner-mode-btn,
.workout-builder-page .planner-group-add,
.workout-builder-page .planner-group-save,
.workout-builder-page .planner-helper-text,
.workout-builder-page .empty-day-state p,
.workout-builder-page .modal-btn--cancel,
.workout-builder-page .delete-modal__body p,
.workout-builder-page .delete-modal__body strong,
.workout-builder-page .delete-modal__header h3 {
  color: var(--wb-text);
}

.workout-builder-page .planner-empty p,
.workout-builder-page .planner-feedback,
.workout-builder-page .exercise-count {
  color: var(--wb-text-secondary);
}

.workout-builder-page .plan-carousel__header h4,
.workout-builder-page .plan-carousel__selected strong,
.workout-builder-page .existing-plans-panel__head h4 {
  color: var(--wb-text);
}

.workout-builder-page .plan-carousel__position,
.workout-builder-page .plan-carousel__selected,
.workout-builder-page .existing-plans-panel__head p {
  color: var(--wb-text-secondary);
}

.workout-builder-page .planner-feedback--error,
.workout-builder-page .save-message.err {
  color: #fca5a5;
}

.workout-builder-page .save-message.ok {
  color: #86efac;
}

.workout-builder-page .btn-create-plan,
.workout-builder-page .btn-save {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-color: #1d4ed8;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
}

.workout-builder-page .btn-create-plan:hover,
.workout-builder-page .btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
}

.workout-builder-page .btn-ai-suggest {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  border-color: #b91c1c;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(220, 38, 38, 0.22);
}

.workout-builder-page .btn-ai-suggest:hover {
  background: linear-gradient(135deg, #b91c1c, #991b1b);
}

.workout-builder-page .btn-add-exercise-day {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-color: #1d4ed8;
  color: #ffffff;
}

.workout-builder-page .btn-add-exercise-day:hover {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
}

.workout-builder-page .day-action-btn--move,
.workout-builder-page .day-action-btn--reset,
.workout-builder-page .day-action-btn--select,
.workout-builder-page .plan-carousel__item,
.workout-builder-page .plan-carousel__nav,
.workout-builder-page .planner-mode-btn,
.workout-builder-page .modal-btn--cancel,
.workout-builder-page .day-kebab-btn,
.workout-builder-page .day-kebab-menu,
.workout-builder-page .day-kebab-item,
.workout-builder-page .chevron-btn {
  background: var(--wb-surface-2);
  border-color: var(--wb-border);
  color: var(--wb-text-secondary);
}

.workout-builder-page .day-action-btn--move:hover:not(:disabled),
.workout-builder-page .day-action-btn--reset:hover:not(:disabled),
.workout-builder-page .day-action-btn--select:hover,
.workout-builder-page .modal-btn--cancel:hover,
.workout-builder-page .day-kebab-btn:hover,
.workout-builder-page .day-kebab-item:hover,
.workout-builder-page .chevron-btn:hover {
  background: var(--wb-surface-3);
  color: var(--wb-text);
}

.workout-builder-page .planner-mode-btn.active,
.workout-builder-page .day-action-btn--selected,
.workout-builder-page .plan-carousel__item--selected,
.workout-builder-page .plan-carousel__dot--active,
.workout-builder-page .selected-badge {
  background: color-mix(in srgb, var(--wb-accent) 24%, transparent 76%);
  border-color: color-mix(in srgb, var(--wb-accent) 50%, transparent 50%);
  color: color-mix(in srgb, var(--wb-accent) 78%, #ffffff 22%);
}

.workout-builder-page .plan-carousel__dot {
  background: var(--wb-surface-3);
  border-color: var(--wb-border);
}

.workout-builder-page .day-action-btn--edit {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-color: #1d4ed8;
  color: #ffffff;
}

.workout-builder-page .day-action-btn--edit:hover {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
}

.workout-builder-page .day-action-btn--delete,
.workout-builder-page .day-kebab-item--delete,
.workout-builder-page .modal-btn--delete {
  background: rgba(127, 29, 29, 0.2);
  border-color: rgba(248, 113, 113, 0.55);
  color: #fca5a5;
}

.workout-builder-page .day-action-btn--delete:hover:not(:disabled),
.workout-builder-page .day-kebab-item--delete:hover,
.workout-builder-page .modal-btn--delete:hover {
  background: rgba(127, 29, 29, 0.3);
  color: #fecaca;
}

.workout-builder-page .delete-modal__header,
.workout-builder-page .delete-modal__actions,
.workout-builder-page .workout-day-panel,
.workout-builder-page .delete-modal {
  border-color: var(--wb-border);
}

.workout-builder-page .empty-day-state {
  background: var(--wb-surface-2);
  border-color: var(--wb-border-strong);
}

.workout-builder-page .workout-day-card.active {
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 8px 18px rgba(34, 197, 94, 0.12);
}

.workout-builder-page :deep(.schedule-card),
.workout-builder-page :deep(.planner-card),
.workout-builder-page :deep(.exercise-block),
.workout-builder-page :deep(.workout-goal-panel),
.workout-builder-page :deep(.workout-goal-panel__header),
.workout-builder-page :deep(.workout-goal-panel__icon),
.workout-builder-page :deep(.exercise-block__actions button),
.workout-builder-page :deep(.exercise-block__fields input),
.workout-builder-page :deep(.exercise-block__fields select),
.workout-builder-page :deep(.builder-field input),
.workout-builder-page :deep(.builder-field select),
.workout-builder-page :deep(.builder-field textarea),
.workout-builder-page :deep(.schedule-btn--ghost),
.workout-builder-page :deep(.schedule-btn--danger) {
  background: var(--wb-surface-2);
  border-color: var(--wb-border);
  color: var(--wb-text-secondary);
}

.workout-builder-page :deep(.schedule-card.selected) {
  border-color: color-mix(in srgb, var(--wb-accent) 60%, var(--wb-border) 40%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--wb-accent) 20%, transparent 80%);
}

.workout-builder-page :deep(.schedule-card__title-row h4),
.workout-builder-page :deep(.exercise-block__identity h4),
.workout-builder-page :deep(.builder-field span),
.workout-builder-page :deep(.workout-goal-panel__title),
.workout-builder-page :deep(.schedule-card__meta strong),
.workout-builder-page :deep(.exercise-block__fields span) {
  color: var(--wb-text);
}

.workout-builder-page :deep(.schedule-card__meta),
.workout-builder-page :deep(.exercise-block__identity p),
.workout-builder-page :deep(.workout-goal-panel__title-icon),
.workout-builder-page :deep(.workout-goal-panel__icon),
.workout-builder-page :deep(.exercise-block__badge),
.workout-builder-page :deep(.type-badge--other) {
  color: var(--wb-text-secondary);
}

.workout-builder-page :deep(.exercise-block__identity img) {
  border-color: var(--wb-border);
  background: var(--wb-surface-3);
}

.workout-builder-page :deep(.schedule-btn--ghost) {
  color: var(--wb-text);
}

.workout-builder-page :deep(.schedule-btn--ghost:hover) {
  background: var(--wb-surface-3);
}

.workout-builder-page :deep(.schedule-btn--primary) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-color: #1d4ed8;
  color: #ffffff;
}

.workout-builder-page :deep(.schedule-btn--danger) {
  background: rgba(127, 29, 29, 0.2);
  border-color: rgba(248, 113, 113, 0.55);
  color: #fca5a5;
}

.workout-builder-page :deep(.schedule-btn--danger:hover:not(:disabled)) {
  background: rgba(127, 29, 29, 0.3);
}

.workout-builder-page :deep(.exercise-block__actions .btn-remove) {
  background: rgba(127, 29, 29, 0.2);
  border-color: rgba(248, 113, 113, 0.55);
  color: #fca5a5;
}

.workout-builder-page :deep(.builder-field input:focus),
.workout-builder-page :deep(.builder-field select:focus),
.workout-builder-page :deep(.builder-field textarea:focus),
.workout-builder-page :deep(.exercise-block__fields input:focus),
.workout-builder-page :deep(.exercise-block__fields select:focus),
.workout-builder-page .builder-tab:focus-visible,
.workout-builder-page .btn-create-plan:focus-visible,
.workout-builder-page .btn-ai-suggest:focus-visible,
.workout-builder-page .btn-save:focus-visible,
.workout-builder-page .day-action-btn:focus-visible,
.workout-builder-page :deep(.schedule-btn:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--wb-accent) 30%, transparent 70%);
}

@media (max-width: 768px) {
  .workout-builder-page :deep(input),
  .workout-builder-page :deep(select),
  .workout-builder-page :deep(textarea),
  .workout-builder-page .planner-group-editor input {
    font-size: 16px;
  }
}

@media (min-width: 640px) {
  .workout-builder-canvas { gap: 16px; }

  .builder-hero {
    padding: 20px;
  }

  .builder-section,
  .planner-section,
  .collapsible-panel {
    padding: 20px;
  }

  .planner-group-editor {
    grid-template-columns: 1fr auto;
  }

  .schedule-hub-head__actions {
    justify-content: flex-end;
  }

  .planner-group-add {
    min-width: 132px;
  }

  .planner-primary-actions {
    justify-content: flex-end;
  }

  .btn-add-exercise {
    width: auto;
    min-width: 180px;
  }

  .builder-footer {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .btn-save {
    width: auto;
    min-width: 180px;
  }
}

@media (min-width: 992px) {
  .workout-builder-canvas { gap: 16px; }

  .builder-hero {
    padding: 22px;
  }

  .builder-section,
  .planner-section,
  .collapsible-panel,
  .builder-footer {
    padding: 24px;
  }

  .planner-content {
    gap: 16px;
  }
}

/* ── Tab label responsive toggle ────────────────────────────────── */
.tab-label-short { display: none; }

.workout-builder-page .select-plan-accordion__item.open {
  border-color: color-mix(in srgb, var(--wb-accent) 55%, var(--wb-border) 45%);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
}

@media (max-width: 639px) {
  .tab-label-full  { display: none; }
  .tab-label-short { display: inline; }

  .main-builder-accordion {
    gap: 8px;
  }

  .main-builder-accordion__header {
    min-height: 48px;
    padding: 0 12px;
  }

  .main-builder-accordion__title {
    font-size: 0.9rem;
  }

  .main-builder-accordion__body {
    padding: 10px;
  }
}

/* ── AI Suggest section ──────────────────────────────────────────── */
.ai-suggest-section {
  min-height: 220px;
  display: block;
}

.ai-suggest-body {
  width: 100%;
  display: grid;
  gap: 10px;
}

.ai-suggest-card {
  background: var(--wb-surface-2);
  border: 1px solid var(--wb-border);
  border-radius: 16px;
  padding: 14px;
  display: grid;
  gap: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
}

.ai-prompt-label {
  font-weight: 700;
  color: var(--wb-text);
  font-size: 0.9rem;
}

.ai-prompt-input {
  width: 100%;
  border: 1px solid var(--wb-border);
  border-radius: 12px;
  padding: 10px 12px;
  min-height: 96px;
  resize: vertical;
  font: inherit;
  color: var(--wb-text);
  background: var(--wb-surface-1);
}

.ai-actions {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.ai-test-btn {
  background: linear-gradient(135deg, #0f766e, #115e59);
  border-color: #99f6e4;
}

.ai-feedback {
  background: var(--wb-surface-2);
  border: 1px solid var(--wb-border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.92rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--wb-text-secondary);
}

.ai-feedback--error {
  border-color: rgba(248, 113, 113, 0.55);
  color: #fecaca;
}

.ai-feedback--success {
  border-color: rgba(134, 239, 172, 0.42);
  color: #bbf7d0;
}

.ai-feedback--hint {
  border-color: color-mix(in srgb, var(--wb-accent) 45%, transparent 55%);
  color: var(--wb-text-secondary);
}

.ai-generate-btn {
  border: 1px solid #93c5fd;
  border-radius: 12px;
  min-height: 46px;
  padding: 0 16px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 6px;
  cursor: pointer;
  box-shadow: none;
}

.ai-generate-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

/* ── Short / long label toggle ───────────────────────────────────── */
.btn-label-short { display: none; }

@media (max-width: 639px) {
  /* Show short labels, hide long ones */
  .btn-label-full  { display: none; }
  .btn-label-short { display: inline; }

  /* Side-by-side instead of stacked */
  .schedule-hub-head__actions,
  .schedule-hub-empty__actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(156px, 1fr));
    gap: 8px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .main-builder-accordion,
  .main-builder-accordion__item,
  .main-builder-accordion__body,
  .select-plan-accordion,
  .select-plan-accordion__body,
  .plan-carousel,
  .existing-plans-panel,
  .schedule-hub-list {
    min-width: 0;
    width: 100%;
    overflow-x: hidden;
  }

  .plan-carousel__footer {
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    align-items: center;
  }

  .plan-carousel__nav {
    width: auto;
    min-width: 78px;
    padding: 0 8px;
    min-height: 32px;
    font-size: 0.76rem;
  }

  .plan-carousel__dots {
    gap: 6px;
  }

  .plan-carousel__dot {
    width: 9px;
    height: 9px;
  }

  .btn-create-plan,
  .btn-ai-suggest {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    line-height: 1;
  }

  /* Tab bar: 3 tabs fit without scrolling */
  .builder-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    overflow: visible;
    width: 100%;
  }
  .builder-tab {
    min-width: 0;
    font-size: 0.82rem;
    padding: 0 8px;
    white-space: normal;
    line-height: 1.15;
  }

  /* Hero stats: stay within the viewport */
  .builder-hero__stats {
    grid-template-columns: repeat(3, minmax(80px, 1fr));
  }
  .builder-hero__stats div,
  .builder-hero__stats span,
  .builder-hero__stats strong {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  /* Footer: stack label above save button */
  .builder-footer {
    grid-template-columns: 1fr;
  }
  .btn-save {
    width: 100%;
  }

  /* Day actions: wrap on very small phones */
  .day-actions {
    flex-wrap: wrap;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE COMPRESSION  ≤ 768px
   v0.81.5 — Workout Builder Mobile Compression
   CSS only — no logic/API/auth changes
   ═══════════════════════════════════════════════════════════════════ */

/* Global density helper */
.workout-builder-mobile {
  gap: 8px;
  padding: 8px;
  margin: 6px;
}

@media (max-width: 768px) {
  .workout-builder-page {
    padding-bottom: calc(128px + env(safe-area-inset-bottom));
    overflow-x: clip;
  }

  /* ── Canvas ── */
  .workout-builder-canvas {
    gap: 8px;
  }

  .main-builder-accordion {
    gap: 8px;
  }

  .main-builder-accordion__item {
    border-radius: 12px;
  }

  .main-builder-accordion__header {
    min-height: 44px;
    padding: 0 10px;
  }

  .main-builder-accordion__icon {
    width: 24px;
    height: 24px;
  }

  .main-builder-accordion__body {
    padding: 8px;
  }

  /* ── Hero compression ── */
  .builder-hero {
    padding: 10px 12px;
    gap: 8px;
    border-radius: 14px;
    flex-direction: row;
    align-items: center;
  }

  .builder-hero h2 {
    font-size: 1rem;
    margin: 0;
  }

  .builder-hero p {
    font-size: 0.78rem;
    margin-top: 2px;
  }

  /* Stats: 3-col, 60px target height */
  .builder-hero__stats {
    gap: 6px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .builder-hero__stats div {
    padding: 6px 8px;
    border-radius: 8px;
    gap: 2px;
    min-height: 0;
  }

  .builder-hero__stats strong {
    font-size: 0.95rem;
    line-height: 1;
  }

  .builder-hero__stats span {
    font-size: 0.65rem;
  }

  /* ── Tab bar ── */
  .builder-tabs {
    padding: 4px;
    border-radius: 10px;
  }

  .builder-tab {
    min-height: 34px;
    font-size: 0.78rem;
    padding: 0 7px;
    gap: 5px;
    border-radius: 7px;
  }

  .builder-tab i {
    font-size: 0.74rem;
  }

  /* ── Sections ── */
  .builder-section,
  .planner-section,
  .collapsible-panel {
    padding: 10px;
    border-radius: 12px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  /* ── Day card header ── */
  .workout-day-header {
    padding: 8px 10px;
    gap: 6px;
  }

  .day-title-group {
    gap: 5px;
  }

  .day-title-group strong {
    font-size: 0.85rem;
  }

  .selected-badge {
    font-size: 10px;
    padding: 1px 7px;
    border: 1px solid rgba(96, 165, 250, 0.28);
    background: rgba(59, 130, 246, 0.16);
    color: #93c5fd;
  }

  .exercise-count {
    font-size: 11px;
  }

  /* Day actions — kebab on mobile */
  .day-actions {
    display: none;
  }

  .workout-day-header {
    flex-wrap: nowrap;
  }

  /* ── Day panel ── */
  .workout-day-panel {
    padding: 8px 10px;
  }

  .day-exercises-list {
    gap: 8px;
    margin-bottom: 10px;
  }

  /* ── Add Exercise button ── */
  .btn-add-exercise-day {
    padding: 8px 16px;
    min-height: 36px;
    font-size: 0.82rem;
    border-radius: 10px;
  }

  /* ── Planner tools ── */
  .planner-tools {
    gap: 8px;
    margin-bottom: 10px;
  }

  .planner-mode-toggle,
  .planner-group-editor {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .planner-group-editor {
    grid-template-columns: 1fr;
  }

  .planner-mode-btn {
    min-height: 34px;
    font-size: 0.82rem;
    padding: 4px 8px;
    min-width: 0;
  }

  .planner-group-editor input {
    min-height: 36px;
    padding: 7px 10px;
    font-size: 0.82rem;
    border-radius: 10px;
  }

  .planner-group-add,
  .planner-group-save {
    min-height: 36px;
    font-size: 0.82rem;
    padding: 0 12px;
    border-radius: 10px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  /* ── Schedule list ── */
  .schedule-hub-list {
    gap: 8px;
  }

  /* ── Create/AI buttons ── */
  .btn-create-plan,
  .btn-ai-suggest {
    min-height: 42px;
    font-size: 13px;
    padding: 0 12px;
    border-radius: 999px;
    box-shadow: none;
  }

  /* ── Empty states ── */
  .planner-empty {
    padding: 16px 12px;
    min-height: 120px;
    gap: 6px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .planner-empty__icon {
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }

  .planner-empty h4 {
    font-size: 0.9rem;
  }

  .planner-empty p {
    font-size: 0.8rem;
  }

  /* ── Collapsible header ── */
  .collapsible-header {
    padding: 10px 12px;
    border-radius: 10px;
  }

  .collapsible-header__text strong {
    font-size: 0.9rem;
  }

  .collapsible-header__text small {
    font-size: 0.76rem;
  }

  .collapsible-panel__body {
    margin-top: 10px;
  }

  /* ── Footer ── */
  .builder-footer {
    padding: 10px;
    gap: 8px;
    border-radius: 10px;
  }

  .btn-save {
    min-height: 42px;
    font-size: 13px;
    padding: 0 14px;
  }

  /* ── Heading groups ── */
  .planner-heading-group h3 {
    font-size: 0.9rem;
  }

  .planner-heading-group p {
    font-size: 0.77rem;
  }

  .builder-section__head h3 {
    font-size: 0.9rem;
  }

  .builder-section__head p {
    font-size: 0.77rem;
  }

  /* ── Workout day accordion ── */
  .workout-day-accordion {
    gap: 6px;
  }

  .workout-day-card {
    border-radius: 10px;
    width: 100%;
    max-width: 100%;
  }

  /* ── Empty day state ── */
  .empty-day-state {
    padding: 14px;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .empty-day-state p {
    font-size: 0.82rem;
  }
}

@media (max-width: 600px) {
  .workout-builder-page {
    padding-bottom: calc(100px + var(--wa-mobile-bottom-nav-clearance, 0px));
  }
}

@media (max-width: 480px) {
  .workout-builder-canvas {
    gap: 6px;
  }

  .builder-hero {
    padding: 8px 10px;
  }

  .builder-hero h2 {
    font-size: 0.92rem;
  }

  .builder-hero__stats div {
    padding: 5px 6px;
  }

  .builder-hero__stats strong {
    font-size: 0.88rem;
  }

  .builder-hero__stats span {
    font-size: 0.6rem;
  }

  .builder-tab {
    min-height: 30px;
    font-size: 0.74rem;
    padding: 0 5px;
  }

  .day-action-btn {
    min-height: 26px;
    padding: 0 6px;
    font-size: 0.68rem;
  }

  .day-action-btn,
  .btn-add-exercise-day,
  .planner-group-add,
  .planner-group-save,
  .btn-create-plan,
  .btn-ai-suggest,
  .btn-save {
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .builder-section,
  .planner-section,
  .collapsible-panel {
    padding: 8px;
    border-radius: 10px;
  }
}

@media (max-width: 390px) {
  .workout-builder-canvas {
    gap: 5px;
  }

  .builder-hero {
    padding: 7px 9px;
  }

  .builder-hero h2 {
    font-size: 0.88rem;
  }

  .builder-hero__stats strong {
    font-size: 0.82rem;
  }

  .builder-tab {
    min-height: 28px;
    font-size: 0.7rem;
    gap: 4px;
  }

  .builder-tab i {
    font-size: 0.68rem;
  }

  .day-action-btn {
    min-height: 24px;
    padding: 0 5px;
    font-size: 0.65rem;
  }

  .workout-day-header {
    padding: 6px 8px;
  }
}
</style>
