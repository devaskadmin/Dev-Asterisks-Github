<script setup>
   //Import libaries
   import { ref, reactive, computed, onMounted, watch, nextTick } from "vue";
   import DateDropDown from "@/components/DropDownDate.vue"; // not template folder
  import { API_BASE } from '@/config/env';
  import { DEFAULT_EXERCISE_IMAGE, getExerciseImage, getExerciseImageFromGallery } from '@/utils/exerciseImage';
  import { useExerciseFiltering } from '@/composable/exerciseFilters';
   import '@fortawesome/fontawesome-free/css/all.min.css';
   
   // ---- VARIABLES ----
   const allExercises = ref([]);
  const searchExerciseRows = ref([]);
  const searchResultTotal = ref(0);
  const searchTotalPages = ref(0);
  const searchFilterOptions = ref({ muscleGroups: [], equipment: [] });
  const logLibraryLoaded = ref(false);
   const selectedExercise = ref(null);
   const workoutType = ref("All");
   const selectedMuscleGroup = ref("All");
   const selectedEquipment = ref("All");
   const searchExercise = ref("");
   const workoutList = ref([]);
   const activeTab = ref('search-exercises'); // default tab
  const filtersOpen = ref(false);
   const existingLogs = ref([]);
  const exercisesLoadError = ref("");
  const exerciseView = ref('all');
  const favoriteExerciseIds = ref(new Set());
  const favoriteExercises = ref([]);
  const loadingFavorites = ref(false);
  const favoritesLoadError = ref("");
  const myCustomExercises = ref([]);
  const customExercisesLoadError = ref('');
  const currentUserRole = ref('');
  const logSearchExercise = ref('');
  const logWorkoutTypeFilter = ref('All');
  const logMuscleGroupFilter = ref('All');
  const logEquipmentFilter = ref('All');
  const logOwnershipFilter = ref('all');
  const logSuggestionIndex = ref(-1);
   
   
   
   const exercise = reactive({
     sets: "",
     reps: "",
     weight: "",
     duration: "",
     ImageGallery: "[]", // fallback
   });

   // Edit Exercise state (move this up so it's always in scope)
   const editExercise = reactive({
     ExerciseID: '',
     ExerciseTitle: '',
     MuscleGroup: '',
     Equipment: '',
     WorkoutType: '',
     RecordingType: '',
     Instructions: '',
    ImageGallery: '[]',
    CreateAsGlobalExercise: false,
    CanDelete: 0,
    CanEdit: 0,
   });

   // Error and success state for edit form
   const updateError = ref('');
   const updateSuccess = ref('');
   const isSaving = ref(false);
  const isAdminUser = computed(() => {
    const normalized = String(currentUserRole.value || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'administrator';
  });
   
   // ---- FILTER EXERCISES ----
   const logFilters = computed(() => ({
    search: logSearchExercise.value,
    workoutType: logWorkoutTypeFilter.value,
    muscleGroup: logMuscleGroupFilter.value,
    equipment: logEquipmentFilter.value,
    ownership: logOwnershipFilter.value,
   }));

  const filteredExercises = computed(() => searchExerciseRows.value);

   const filteredLogExercises = useExerciseFiltering({
    rowsRef: allExercises,
    filtersRef: logFilters,
   });

   const logExerciseMatches = computed(() => filteredLogExercises.value.slice(0, 8));

   
   // ---- GET MUSCLE GROUPS + EQUIPMENT ----
   const muscleGroups = computed(() => {
     const groups = Array.from(new Set([
       ...searchFilterOptions.value.muscleGroups,
       ...allExercises.value.map(ex => ex.MuscleGroup),
     ].filter(Boolean)));
     groups.sort((a, b) => {
       if (a === null || a === undefined) return 1;
       if (b === null || b === undefined) return -1;
       return a.localeCompare(b);
     });
     return ["All", ...groups];
   });
   const equipmentList = computed(() => {
     const groups = new Set([
       ...searchFilterOptions.value.equipment,
       ...allExercises.value.map(ex => ex.Equipment),
     ].filter(Boolean));
     return ["All", ...groups];
   });
   // ---- GET MUSCLE GROUPS + EQUIPMENT ----
   
   // ---- IMAGE GALLERY FOR EXCERCISE ---
   const updateGallery = () => {
     const match = allExercises.value.find(
       (ex) => ex.ExerciseTitle === selectedExercise.value &&
         (workoutType.value === 'All' || ex.WorkoutType?.toLowerCase() === workoutType.value.toLowerCase())
     );
     if (match) {
       exercise.ImageGallery = match.ImageGallery || "[]";
     } else {
       exercise.ImageGallery = "[]";
     }
   };

   watch(selectedExercise, updateGallery);
   watch(workoutType, updateGallery);
   
   const galleryImages = computed(() => {
     try {
       return typeof exercise.ImageGallery === "string"
         ? JSON.parse(exercise.ImageGallery)
         : exercise.ImageGallery;
     } catch {
       return [];
     }
   });
   // ---- IMAGE GALLERY FOR EXCERCISE ---
   
   // ---- ADD EXERCISE ----
   const addError = ref("");


   const addExercise = () => {
  addError.value = ""; // Reset error
  // If timer is running, stop it
  if (stopwatchRunning.value) {
    clearInterval(stopwatchInterval);
    stopwatchRunning.value = false;
  }

  // Get the selected exercise object
  const selectedExObj = allExercises.value.find(ex => ex.ExerciseTitle === selectedExercise.value);
  const selectedType = selectedExObj?.WorkoutType || workoutType.value;

  // Duration logic
  let duration = 0;
  if (selectedType !== 'Strength') {
    if (typeof exercise.duration !== 'number' || exercise.duration <= 0) {
      exercise.duration = 0.01;
    }
    duration = exercise.duration;
  } else {
    // Strength: duration is optional
    duration = (typeof exercise.duration === 'number' && exercise.duration > 0) ? exercise.duration : 0;
  }

  // Always include all fields for log table binding
  let newLog = {
    name: selectedExercise.value,
    date: selectedDate.value,
    image: selectedImage.value,
    type: selectedType,
    duration: duration || 0,
    // Strength fields
    sets: selectedType === 'Strength' ? (exercise.sets || 0) : 0,
    reps: selectedType === 'Strength' ? (exercise.reps || 0) : 0,
    weight: selectedType === 'Strength' ? (exercise.weight || 0) : 0,
    // Cardio/Other fields
    distance: selectedType !== 'Strength' ? (exercise.distance || 0) : 0,
    lapsRep: selectedType !== 'Strength' ? (exercise.lapsRep || 0) : 0,
    'Laps-Rep': selectedType !== 'Strength' ? (exercise.lapsRep || 0) : 0,
    calories: selectedType !== 'Strength' ? (exercise.calories || 0) : 0,
    speed: selectedType !== 'Strength' ? (exercise.speed || 0) : 0
  };

  workoutList.value.push(newLog);
};


//REMOVE excerise
const removeWorkout = (index) => {
  workoutList.value.splice(index, 1);
};
//Remove Excerise



//Delete excerise log
const deleteLog = async (workoutLogId) => {
  if (!workoutLogId) return;
  if (!confirm('Are you sure you want to delete this workout log?')) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/workout-log/delete-workout-log/${workoutLogId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to delete workout log');
    await loadWorkoutLogs();
  } catch (err) {
    alert('Failed to delete workout log.');
  }
};


   // ---- ADD EXERCISE ----
   
   // ---- ESTIMATE CALORIES ----
   const estimatedCalories = computed(() => {
     if (workoutType.value === "Cardio") {
       return exercise.duration ? exercise.duration * 10 : 0;
     } else {
       return exercise.sets && exercise.reps
         ? exercise.sets * exercise.reps * 0.5
         : 0;
     }
   });
   // ---- ESTIMATE CALORIES ----
   
   
   
   //Update Date format
  const toMySQLDate = (date) => {
    const d = new Date(date);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };





//Save Workout
// Save all workout logs for the current user and date
const saveWorkout = async () => {
  if (!userId.value || !selectedDate.value || workoutList.value.length === 0) {
    alert('Missing user, date, or no exercises to save.');
    return;
  }
  const formattedDate = toMySQLDate(selectedDate.value);
  let errors = [];
  for (const log of workoutList.value) {
    // Find ExerciseID from allExercises
    const exObj = allExercises.value.find(ex => ex.ExerciseTitle === log.name || ex.ExerciseTitle === log.ExerciseTitle);
    const ExerciseID = exObj ? exObj.ExerciseID : null;
    if (!ExerciseID) {
      errors.push(`ExerciseID not found for ${log.name || log.ExerciseTitle}`);
      continue;
    }
    const payload = {
      UserID: userId.value,
      ExerciseID,
      WorkoutDate: formattedDate,
      WorkoutType: log.type,
      Duration: log.duration || 0,
      Reps: log.reps || 0,
      Sets: log.sets || 0,
      Weight: log.weight || 0,
      Calories: log.calories || 0,
      Distance: log.distance || 0,
      Speed: log.speed || 0,
      'Laps-Rep': log['Laps-Rep'] || log.lapsRep || 0
    };
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/workout-log/add-workout-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json();
        errors.push(errData.error || `Failed to save log for ${log.name || log.ExerciseTitle}`);
      }
    } catch (err) {
      errors.push(`Network error for ${log.name || log.ExerciseTitle}`);
    }
  }
  if (errors.length > 0) {
    alert('Some logs failed to save:\n' + errors.join('\n'));
  } else {
    alert('âœ… All workout logs saved!');
    workoutList.value = [];
    await loadWorkoutLogs();
  }
};

//Save Workout
   

//End of Load Logs
   const fetchWorkoutLogs = async () => {
  if (!userId.value || !selectedDate.value) return;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/workout-log/get-workout-log?userId=${userId.value}&date=${selectedDate.value}`, {
      credentials: 'include'
    });

    const data = await res.json();

    workoutList.value = data.map(log => ({
      name: log.ExerciseTitle,
      type: log.WorkoutType,
      sets: log.Sets,
      reps: log.Reps,
      weight: log.Weight,
      duration: log.Duration,
      calories: log.Calories,
      distance: log.Distance,
      speed: log.Speed,
      'Laps-Rep': log['Laps-Rep'],
      date: log.WorkoutDate,
      image: getExerciseImage({
        ExerciseID: log.ExerciseID,
        ImageURL: log.ImageURL,
        ImageGallery: log.ImageGallery,
        PrimaryImage: log.PrimaryImage,
        ResolvedImageURL: log.ResolvedImageURL,
      })
    }));

  } catch (err) {
    console.error("âŒ Failed to load workout logs:", err);
  }
};



// Load Workout logs and map to correct structure for log table
const loadWorkoutLogs = async () => {
  if (!userId.value || !selectedDate.value) return;
  const formattedDate = toMySQLDate(selectedDate.value);

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/workout-log/get-workout-log?userId=${userId.value}&date=${formattedDate}`, {
      credentials: 'include'
    });
    const data = await res.json();
    existingLogs.value = Array.isArray(data)
      ? data.map(log => ({
          name: log.ExerciseTitle,
          type: log.WorkoutType,
          sets: log.Sets,
          reps: log.Reps,
          weight: log.Weight,
          duration: log.Duration,
          calories: log.Calories,
          distance: log.Distance,
          speed: log.Speed,
          'Laps-Rep': log['Laps-Rep'],
          date: log.WorkoutDate,
          image: getExerciseImage({
            ExerciseID: log.ExerciseID,
            ImageURL: log.ImageURL,
            ImageGallery: log.ImageGallery,
            PrimaryImage: log.PrimaryImage,
            ResolvedImageURL: log.ResolvedImageURL,
          }),
          WorkoutLogID: log.WorkoutLogID // for remove/edit
        }))
      : [];
  } catch (err) {
    console.error("âŒ Failed to fetch workout logs:", err);
    existingLogs.value = [];
  }
};
//End of Load logs
   





   


   
   
   
   
   
   
  //Get Excerises
  const userId = ref(null);
  
  // Use Date object for selected date
  const selectedDateRaw = ref(new Date());

   
  // Computed: Format the date as d/m/yyyy (e.g., 6/5/2025)   
  const selectedDate = computed(() => {
  const d = selectedDateRaw.value;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // months are 0-based
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
});
   

const loadExercisesLibrary = async () => {
  exercisesLoadError.value = "";

  try {
    const query = new URLSearchParams({
      paginated: '1',
      view: exerciseView.value,
      search: searchExercise.value.trim(),
      workoutType: workoutType.value,
      muscleGroup: selectedMuscleGroup.value,
      equipment: selectedEquipment.value,
      page: String(currentPage.value),
      pageSize: String(itemsPerPage.value),
    });
    const res = await fetch(`${API_BASE}/api/exercises?${query}`, {
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error(`Failed to load exercises (${res.status})`);
    }

    const data = await res.json();
    searchExerciseRows.value = Array.isArray(data?.items) ? data.items : [];
    searchResultTotal.value = Number(data?.total || 0);
    searchTotalPages.value = Number(data?.totalPages || 0);
    searchFilterOptions.value = {
      muscleGroups: Array.isArray(data?.filters?.muscleGroups) ? data.filters.muscleGroups : [],
      equipment: Array.isArray(data?.filters?.equipment) ? data.filters.equipment : [],
    };
    logLibraryLoaded.value = false;

    const nextFavoriteIds = new Set();
    searchExerciseRows.value.forEach((ex) => {
      if (Number(ex?.IsFavorite || 0) === 1) {
        nextFavoriteIds.add(Number(ex.ExerciseID));
      }
    });
    favoriteExerciseIds.value = nextFavoriteIds;
  } catch (err) {
    console.error('âŒ Failed to load exercises:', err);
    searchExerciseRows.value = [];
    searchResultTotal.value = 0;
    searchTotalPages.value = 0;
    favoriteExerciseIds.value = new Set();
    exercisesLoadError.value = 'Could not load exercises right now.';
  }
};

const loadLogExercisesLibrary = async () => {
  if (logLibraryLoaded.value) return;
  const res = await fetch(`${API_BASE}/api/exercises?view=all`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load workout-log exercises (${res.status})`);
  const data = await res.json();
  allExercises.value = Array.isArray(data) ? data : [];
  logLibraryLoaded.value = true;
};

const loadCurrentSessionRole = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/session`, { credentials: 'include' });
    if (!res.ok) {
      currentUserRole.value = '';
      return;
    }

    const data = await res.json();
    currentUserRole.value = String(data?.user?.role || data?.user?.roleSlug || '').trim();
  } catch (err) {
    console.error('Failed to resolve session role:', err);
    currentUserRole.value = '';
  }
};

const loadMyCustomExercises = async () => {
  customExercisesLoadError.value = '';
  try {
    const res = await fetch(`${API_BASE}/api/exercises/my`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Failed to load custom exercises (${res.status})`);
    }
    const data = await res.json();
    myCustomExercises.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to load custom exercises:', err);
    myCustomExercises.value = [];
    customExercisesLoadError.value = 'Could not load your custom exercises right now.';
  }
};

const isFavoriteExercise = (exerciseId) => {
  return favoriteExerciseIds.value.has(Number(exerciseId));
};

const toggleFavoriteExercise = async (exercise) => {
  const exerciseId = Number(exercise?.ExerciseID || 0);
  if (!exerciseId) return;

  try {
    const shouldAddFavorite = !isFavoriteExercise(exerciseId);
    const method = shouldAddFavorite ? 'POST' : 'DELETE';
    const url = `${API_BASE}/api/exercises/${exerciseId}/favorite`;

    const res = await fetch(url, {
      method,
      credentials: 'include'
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Favorite] Failed ${res.status}:`, errorText);
      throw new Error(`Favorite update failed (${res.status}): ${errorText}`);
    }

    const next = new Set(favoriteExerciseIds.value);
    if (shouldAddFavorite) {
      next.add(exerciseId);
      exercise.IsFavorite = 1;
    } else {
      next.delete(exerciseId);
      exercise.IsFavorite = 0;
    }
    favoriteExerciseIds.value = next;

    if (exerciseView.value === 'favorites') {
      await loadExercisesLibrary();
    }
    
    // If we're on the Favorite Exercises tab, reload the favorites list
    if (activeTab.value === 'favorite-exercises') {
      await loadFavoriteExercises();
    }
  } catch (err) {
    console.error('Favorite update failed:', err);
    alert('Could not update favorite right now.');
  }
};

const loadFavoriteExercises = async () => {
  loadingFavorites.value = true;
  favoritesLoadError.value = '';
  try {
    const url = `${API_BASE}/api/exercises/favorites`;
    const res = await fetch(url, {
      credentials: 'include'
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Favorite] Failed to load favorites (${res.status}):`, errorText);
      throw new Error(`Failed to load favorites (${res.status})`);
    }

    const data = await res.json();
    console.log('Favorite API response:', data);
    // Handle different response formats from backend
    favoriteExercises.value = Array.isArray(data) ? data : (data.favorites || data.exercises || []);
    console.log('favoriteExercises:', favoriteExercises.value);
  } catch (err) {
    console.error('Error pulling favorites:', err);
    favoriteExercises.value = [];
    favoritesLoadError.value = 'Error pulling favorites. Please try again.';
  } finally {
    loadingFavorites.value = false;
  }
};

//Async function to pass data from front end to backend
onMounted(async () => {
  await loadCurrentSessionRole();

  //Get All exercises
  await loadExercisesLibrary();
  await loadMyCustomExercises();

  //Get user ID
  try {
    const res = await fetch(import.meta.env.VITE_API_BASE + '/api/user-id', {
      credentials: 'include'
    });
    const data = await res.json();
    if (data.userId) {
      userId.value = data.userId;
    } else {
      userId.value = 'Not logged in';
    }
  } catch (err) {
    console.error('Failed to fetch user ID:', err);
    userId.value = 'Error';
  }
  //End of Get user ID

  await loadWorkoutLogs();
  // Auto-switch tab on initial load
  autoSwitchTabToLogOrLibrary();
});

// Watch for date changes and reload logs, then auto-switch tab
watch(selectedDateRaw, async () => {
  await loadWorkoutLogs();
  autoSwitchTabToLogOrLibrary();
});

// Watch for changes in saved logs (existingLogs)
watch(existingLogs, () => {
  autoSwitchTabToLogOrLibrary();
});

watch(exerciseView, async () => {
  currentPage.value = 1;
  await loadExercisesLibrary();
  await loadMyCustomExercises();
});

watch(logSearchExercise, () => {
  logSuggestionIndex.value = -1;
});

// Trigger favorites load whenever the favorites tab becomes active
watch(activeTab, async (tab) => {
  if (tab === 'favorite-exercises') {
    console.log('Favorite tab active');
    loadFavoriteExercises();
  } else if (tab === 'log-exercise') {
    try {
      await loadLogExercisesLibrary();
    } catch (err) {
      console.error('Failed to load exercises for workout logging:', err);
    }
  }
});

// Helper: Switch to log-exercise if there are logs, else to search-exercises
// Does NOT override if the user deliberately switched to the Favorites tab.
function autoSwitchTabToLogOrLibrary() {
  if (activeTab.value === 'favorite-exercises') return;
  if (Array.isArray(existingLogs.value) && existingLogs.value.length > 0) {
    activeTab.value = 'log-exercise';
  } else {
    activeTab.value = 'search-exercises';
  }
}
   
   

   
   
   
   
   
   // Pagination List view
   const displayLimit = ref(3); // default number to show
   const displayedExercises = computed(() => filteredExercises.value.slice(0, displayLimit.value));
   
  const pageSizeOptions = [5, 10, 25, 50, 100];
  const itemsPerPage = ref(10); // default rows per page
  const resultsDisplayMode = ref('list');
   const currentPage = ref(1); // start from 1
    let searchReloadTimer;

   watch([searchExercise, workoutType, selectedMuscleGroup, selectedEquipment], () => {
     currentPage.value = 1;
     clearTimeout(searchReloadTimer);
     searchReloadTimer = setTimeout(loadExercisesLibrary, 250);
   });
   
   
  const getFirstImage = (gallery, exerciseId = 0) => getExerciseImageFromGallery(gallery, exerciseId);

   
   const loadMore = () => {
     visibleCount.value += itemsPerPage.value;
   };
   
   
   
   const pagedExercises = computed(() => {
     return filteredExercises.value;
   });

  const onRowsPerPageChange = async () => {
    currentPage.value = 1;
    await loadExercisesLibrary();
  };
   
   const nextPage = async () => {
     if (currentPage.value >= searchTotalPages.value) return;
     currentPage.value++;
     await loadExercisesLibrary();
   };
   
   const prevPage = async () => {
     if (currentPage.value <= 1) return;
     currentPage.value--;
     await loadExercisesLibrary();
   };
   // Pagination liist view
   
   
   
   
   
   
   //Selected Excerise
   const selectExerciseFromList = (ex) => {
     selectedExercise.value = ex.ExerciseTitle;
     activeTab.value = "log-exercise";
     scrollToLogWorkout();
   };

  const selectExerciseForLog = (ex) => {
    if (!ex) return;
    selectedExercise.value = ex.ExerciseTitle;
    logSearchExercise.value = ex.ExerciseTitle;
    logSuggestionIndex.value = -1;
    scrollToLogWorkout();
  };

  const onLogSearchKeydown = (event) => {
    const list = logExerciseMatches.value;
    if (!list.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      logSuggestionIndex.value = Math.min(logSuggestionIndex.value + 1, list.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      logSuggestionIndex.value = Math.max(logSuggestionIndex.value - 1, 0);
      return;
    }

    if (event.key === 'Enter' && logSuggestionIndex.value >= 0) {
      event.preventDefault();
      selectExerciseForLog(list[logSuggestionIndex.value]);
    }
  };
   
   const scrollToLogWorkout = () => {
     const logWorkoutEl = document.getElementById('log-workout-form');
     if (logWorkoutEl) {
       logWorkoutEl.scrollIntoView({ behavior: 'smooth' });
     }
   };
   
   
//Selected excerise Image handeling
const selectedImage = computed(() => {
  if (!selectedExercise.value) {
    return DEFAULT_EXERCISE_IMAGE;
  }

  const match = allExercises.value.find(ex => ex.ExerciseTitle === selectedExercise.value);
  return getExerciseImage(match);
});
//End of Selected Excerise image
   
   
//Edit Excerise



   const showEditForm = ref(false); // controls form visibility
   
   const workoutTypeOptions = ["Strength", "Cardio", "Other"];
   const recordingTypeOptions = ["Sets & Reps", "Time & Distance", "Custom"];
   
   
   const editExerciseFn = (exercise) => {
     Object.assign(editExercise, exercise);
   };
   
   const startEditing = (exercise) => {
       if (Number(exercise?.CanEdit || 0) !== 1 && !isAdminUser.value) {
         alert('You are not allowed to edit this exercise.');
         return;
       }
     Object.assign(editExercise, exercise);
       editExercise.CreateAsGlobalExercise = Number(exercise?.IsGlobalExercise || 0) === 1;
     activeTab.value = 'search-exercises';
     showEditForm.value = true;
     scrollToEditForm(); // optional
   };
   
   const scrollToEditForm = () => {
     nextTick(() => {
       const el = document.getElementById("editExerciseForm");
       if (el) el.scrollIntoView({ behavior: "smooth" });
     });
   };
   
   
   const saveEditedExercise = async () => {
     // Clear previous messages
     updateError.value = '';
     updateSuccess.value = '';

     // Validation
     if (!editExercise.ExerciseTitle?.trim()) {
       updateError.value = 'Exercise Name is required';
       return;
     }
     if (!editExercise.WorkoutType?.trim()) {
       updateError.value = 'Workout Type is required';
       return;
     }
     if (!editExercise.RecordingType?.trim()) {
       updateError.value = 'Recording Type is required';
       return;
     }
     if (!editExercise.MuscleGroup?.trim()) {
       updateError.value = 'Muscle Group is required';
       return;
     }

     const isUpdate = !!editExercise.ExerciseID;
     if (isUpdate && !editExercise.ExerciseID) {
       updateError.value = 'Missing exercise ID. Cannot update exercise.';
       return;
     }

     // Validate image count
     const totalImages = existingImages.value.length + selectedImages.value.length;
     if (totalImages > 2) {
       updateError.value = 'You can only have up to 2 images.';
       return;
     }

     isSaving.value = true;

     try {
       const formData = new FormData();
       
       // Append all exercise fields
       for (const [key, value] of Object.entries(editExercise)) {
         formData.append(key, value || '');
       }
       
       // Existing images to keep
       formData.append('existingImages', JSON.stringify(existingImages.value));
       // Images to delete
       formData.append('imagesToDelete', JSON.stringify(imagesToDelete.value));
       // New uploads
       selectedImages.value.forEach((img) => formData.append('images', img));

       const url = isUpdate
         ? import.meta.env.VITE_API_BASE + `/api/get-exercise/${editExercise.ExerciseID}`
         : import.meta.env.VITE_API_BASE + '/api/save-exercises';
       const method = isUpdate ? 'PUT' : 'POST';

       const response = await fetch(url, {
         method,
         body: formData,
         credentials: 'include'
       });

       const result = await response.json();

       if (!response.ok) {
         console.error(`âŒ API Error (${response.status}):`, result);
         throw new Error(result.error || result.message || (isUpdate ? 'Update failed' : 'Insert failed'));
       }

       // Success!
       updateSuccess.value = isUpdate ? 'Exercise updated successfully!' : 'Exercise added successfully!';
       
       // Refresh exercise list
       await loadExercisesLibrary();
      await loadMyCustomExercises();
       
       // Clear form after short delay to show success message
       setTimeout(() => {
         showEditForm.value = false;
         selectedImages.value = [];
         imagePreviews.value = [];
         existingImages.value = [];
         imagesToDelete.value = [];
         updateSuccess.value = '';
       }, 2000);

     } catch (err) {
       console.error('âŒ Error updating/inserting exercise:', err);
       
       // Show specific error message
       if (err.message.includes('fetch')) {
         updateError.value = 'Unable to connect to server. Please check your connection.';
       } else {
         updateError.value = err.message || 'Failed to save exercise. Please try again.';
       }
     } finally {
       isSaving.value = false;
     }
   };
   
   //End of Edit Excerise




  //Combined Excerises
const strengthLogs = computed(() =>
  combinedWorkoutLogs.value.filter(log => (log.type || log.WorkoutType) === 'Strength')
);
const cardioLogs = computed(() =>
  combinedWorkoutLogs.value.filter(log => (log.type || log.WorkoutType) === 'Cardio')
);







// --- Per-row Edit State ---
import { reactive as vueReactive } from 'vue';
const rowEditState = vueReactive({}); // key: row index or unique id, value: true/false

// Remove a log from the workout log table
const removeLog = (log, idx) => {
  if (log.isNew) {
    // Remove from workoutList by index (match by all fields for safety)
    const index = workoutList.value.findIndex(w =>
      w.name === log.name &&
      w.date === log.date &&
      w.type === log.type &&
      w.sets === log.sets &&
      w.reps === log.reps &&
      w.weight === log.weight &&
      w.duration === log.duration &&
      w.calories === log.calories &&
      w.distance === log.distance &&
      w.speed === log.speed &&
      w.lapsRep === log.lapsRep
    );
    if (index !== -1) workoutList.value.splice(index, 1);
  } else {
    // Existing log from backend
    deleteLog(log.WorkoutLogID);
  }
  // Remove edit state for this row
  if (rowEditState[idx] !== undefined) delete rowEditState[idx];
};

// Enable edit mode for a row
const editLog = (log, idx) => {
  rowEditState[idx] = true;
};

// Save edited log for a row (backend update for saved logs)
const updateLog = async (log, idx) => {
  // Only allow save for existing logs (not new unsaved ones)
  if (!log.WorkoutLogID) return;
  // Prepare payload
  const payload = {
    UserID: userId.value,
    ExerciseID: allExercises.value.find(ex => ex.ExerciseTitle === (log.name || log.ExerciseTitle))?.ExerciseID,
    WorkoutDate: log.date || log.WorkoutDate,
    WorkoutType: log.type || log.WorkoutType,
    Duration: log.duration || 0,
    Reps: log.reps || 0,
    Sets: log.sets || 0,
    Weight: log.weight || 0,
    Calories: log.calories || 0,
    Distance: log.distance || 0,
    Speed: log.speed || 0,
    'Laps-Rep': log['Laps-Rep'] || log.lapsRep || 0,
    WorkoutLogID: log.WorkoutLogID
  };
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/workout-log/update-workout-log`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to update log');
    // Disable edit mode for this row
    rowEditState[idx] = false;
    // Optionally reload logs to get updated data
    await loadWorkoutLogs();
  } catch (err) {
    // Always disable edit mode even if update fails, so user can retry
    rowEditState[idx] = false;
    alert('Failed to update log.');
  }
};




//df -hcerises
// New State
const newExercise = reactive({
  ExerciseTitle: '',
  WorkoutType: '',
  RecordingType: '',
  Equipment: '',
  MuscleGroup: '',
  Instructions: '',
  ImageGallery: '[]',
  CreateAsGlobalExercise: false,
});

const showAddForm = ref(false); // Toggle form visibility
const creatingGlobalExercise = ref(false);

const openAddExercise = ({ global = false } = {}) => {
  creatingGlobalExercise.value = Boolean(global && isAdminUser.value);
  newExercise.CreateAsGlobalExercise = creatingGlobalExercise.value;
  activeTab.value = 'search-exercises';
  showAddForm.value = true;
  nextTick(() => {
    document.getElementById('customExerciseForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};

const closeAddExercise = () => {
  showAddForm.value = false;
  creatingGlobalExercise.value = false;
  newExercise.CreateAsGlobalExercise = false;
  activeTab.value = 'log-exercise';
};

// Unified AddWorkout for image upload (FormData)
const addFormError = ref("");
const AddWorkout = async () => {
  addFormError.value = "";
  if (!newExercise.ExerciseTitle || !newExercise.WorkoutType || !newExercise.MuscleGroup) {
    addFormError.value = "Error - Please fill out all fields (ExerciseTitle, WorkoutType, MuscleGroup)";
    return;
  }
  newExercise.CreateAsGlobalExercise = Boolean(creatingGlobalExercise.value && isAdminUser.value);
  const formData = new FormData();
  for (const [key, value] of Object.entries(newExercise)) {
    formData.append(key, value || '');
  }
  selectedImages.value.forEach((img) => formData.append('images', img));
  try {
    const res = await fetch(import.meta.env.VITE_API_BASE + '/api/save-exercises', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to add exercise');
    // Refresh the list
    await loadExercisesLibrary();
    await loadMyCustomExercises();
    alert('âœ… New exercise added!');
    closeAddExercise();
    // Reset form and images
    Object.assign(newExercise, {
      ExerciseTitle: '',
      WorkoutType: 'Strength',
      RecordingType: 'Sets & Reps',
      Equipment: '',
      MuscleGroup: '',
      Instructions: '',
      ImageGallery: '[]',
      CreateAsGlobalExercise: false,
    });
    selectedImages.value = [];
    imagePreviews.value = [];
    existingImages.value = [];
    imagesToDelete.value = [];
  } catch (err) {
    console.error('âŒ Add failed:', err);
    addFormError.value = 'Error adding exercise.';
  }
};
// (Duplicate removed below)
//Excerise



// Image Upload (Add/Edit Exercise)
const selectedImages = ref([]); // For new uploads (add/edit)
const imagePreviews = ref([]); // For previewing new uploads
const existingImages = ref([]); // For images already in DB (edit only)
const imagesToDelete = ref([]); // For images marked for deletion (edit only)

// For Add: handle new uploads
const handleImageUpload = (event) => {
  const files = Array.from(event.target.files);
  if (files.length + existingImages.value.length > 2) {
    alert('You can only upload up to 2 images.');
    return;
  }
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      alert(`File ${file.name} is not a valid image`);
      continue;
    }
    selectedImages.value.push(file);
    const reader = new FileReader();
    reader.onload = (e) => imagePreviews.value.push(e.target.result);
    reader.readAsDataURL(file);
  }
};

// For Edit: load existing images from ImageGallery
const loadExistingImages = () => {
  if (editExercise.ImageGallery) {
    try {
      const arr = typeof editExercise.ImageGallery === 'string' ? JSON.parse(editExercise.ImageGallery) : editExercise.ImageGallery;
      existingImages.value = arr.slice(0, 2); // Only allow 2
    } catch {
      existingImages.value = [];
    }
  } else {
    existingImages.value = [];
  }
  imagesToDelete.value = [];
};

// Call this when opening edit form
watch(showEditForm, (val) => { if (val) loadExistingImages(); });

// Remove existing image (mark for deletion)
const removeExistingImage = (img) => {
  imagesToDelete.value.push(img);
  existingImages.value = existingImages.value.filter(i => i !== img);
};

// Remove new upload before saving
const removeNewImage = (idx) => {
  selectedImages.value.splice(idx, 1);
  imagePreviews.value.splice(idx, 1);
};

// (Duplicate removed)

// (Duplicate removed)


// Stopwatch for Duration (Cardio)
const stopwatchTime = ref(0); // seconds
const stopwatchRunning = ref(false);
let stopwatchInterval = null;

const formattedStopwatch = computed(() => {
  const min = Math.floor(stopwatchTime.value / 60).toString().padStart(2, '0');
  const sec = (stopwatchTime.value % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
});

const toggleStopwatch = () => {
  if (stopwatchRunning.value) {
    clearInterval(stopwatchInterval);
    stopwatchRunning.value = false;
    // Set duration in minutes (rounded to 2 decimals)
    exercise.duration = Math.round((stopwatchTime.value / 60) * 100) / 100;
  } else {
    stopwatchRunning.value = true;
    stopwatchInterval = setInterval(() => {
      stopwatchTime.value++;
    }, 1000);
  }
};

const resetStopwatch = () => {
  clearInterval(stopwatchInterval);
  stopwatchRunning.value = false;
  stopwatchTime.value = 0;
  exercise.duration = 0;
};


// Add this computed property to combine logs for the log tables
const combinedWorkoutLogs = computed(() => {
  // Use both new (not yet saved) and existing logs
  // existingLogs.value: logs loaded from backend
  // workoutList.value: logs added in this session (not yet saved)
  // Mark new logs with isNew for correct handling
  const newLogs = workoutList.value.map(log => ({ ...log, isNew: true }));
  // Defensive: ensure existingLogs is always an array
  const existing = Array.isArray(existingLogs.value) ? existingLogs.value : [];
  return [...existing, ...newLogs];
});


// Delete Exercise function
const deleteExercise = async (exercise) => {
  if (!exercise.ExerciseID) {
    alert('No ExerciseID found.');
    return;
  }
  if (Number(exercise?.CanDelete || 0) !== 1 && !isAdminUser.value) {
    alert('You are not allowed to delete this exercise.');
    return;
  }
  if (!confirm('Are you sure you want to delete this exercise? This cannot be undone.')) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/delete-exercise/${exercise.ExerciseID}`,
      {
        method: 'DELETE',
        credentials: 'include'
      });
    if (!res.ok) throw new Error('Failed to delete exercise');
    // Refresh exercise list
    await loadExercisesLibrary();
    await loadMyCustomExercises();
    alert('âœ… Exercise deleted!');
    showEditForm.value = false;
  } catch (err) {
    alert('Failed to delete exercise.');
  }
};

// add this function near other handlers (e.g. after AddWorkout or near pagination handlers)
const clearFilters = () => {
  exerciseView.value = 'all';
  workoutType.value = 'All';
  selectedMuscleGroup.value = 'All';
  selectedEquipment.value = 'All';
  searchExercise.value = '';
  logSearchExercise.value = '';
  logWorkoutTypeFilter.value = 'All';
  logMuscleGroupFilter.value = 'All';
  logEquipmentFilter.value = 'All';
  logOwnershipFilter.value = 'all';
  logSuggestionIndex.value = -1;
  currentPage.value = 1;
  // reset any derived pagination/display state if you need:
  displayLimit.value = 3;
};


</script>

<template>
  <div class="app-page-shell exercises-page">
  <div class="app-page-canvas app-inner-shell exercises-canvas">




  <section class="builder-hero ff-page-header app-header-gradient">


      <div class="builder-hero__content">
        <h2>Exercises Database</h2>
      </div>
      
    </section>








   <!-- Exercise Tab Section -->
  <div class="ex-page-body app-section-card">

              <nav class="ex-tab-bar wa-h-tabs wa-h-tabs--tricolor" role="tablist" aria-label="Log workout sections">
                <button
                  type="button"
                  class="ex-tab wa-h-tab"
                  :class="{ 'ex-tab--active': activeTab === 'search-exercises', 'wa-h-tab--active': activeTab === 'search-exercises' }"
                  :aria-selected="activeTab === 'search-exercises'"
                  role="tab"
                  @click="activeTab = 'search-exercises'"
                >
                  <i class="fa-solid fa-magnifying-glass me-2"></i><span class="tab-label-full">Search Exercises</span><span class="tab-label-short">Search</span>
                </button>
                <button
                  type="button"
                  class="ex-tab wa-h-tab"
                  :class="{ 'ex-tab--active': activeTab === 'log-exercise', 'wa-h-tab--active': activeTab === 'log-exercise' }"
                  :aria-selected="activeTab === 'log-exercise'"
                  role="tab"
                  @click="activeTab = 'log-exercise'"
                >
                  <i class="fa-solid fa-dumbbell me-2"></i><span class="tab-label-full">My Custom Exercises</span><span class="tab-label-short">Custom</span>
                </button>
                <button
                  type="button"
                  class="ex-tab wa-h-tab"
                  :class="{ 'ex-tab--active': activeTab === 'favorite-exercises', 'wa-h-tab--active': activeTab === 'favorite-exercises' }"
                  :aria-selected="activeTab === 'favorite-exercises'"
                  role="tab"
                  @click="activeTab = 'favorite-exercises'; loadFavoriteExercises();"
                >
                  <i class="fa-solid fa-star me-2"></i><span class="tab-label-full">Favorite Exercises</span><span class="tab-label-short">Favorites</span>
                </button>
              </nav>

             <div class="tab-content px-0" id="nav-tabContent">


            <!-- Search Exercise Section -->
            <div v-if="activeTab === 'search-exercises'">
                <!--Search Excerises CONTAINER -->
            <div class="container container-block">
                <div class="panel search-filter-card exercise-database-toolbar search-only-toolbar">
                  <div class="panel-body search-filter-body">
                      <div v-if="exercisesLoadError" class="alert alert-warning">
                        {{ exercisesLoadError }}
                      </div>
                      <div class="search-compact-row">
                        <div class="search-filter-input-wrap search-filter-input-wrap--search-only">
                          <i class="fa-solid fa-magnifying-glass search-filter-input-icon" aria-hidden="true"></i>
                          <input v-model="searchExercise" type="text" class="form-control" placeholder="Search exercise by name" />
                        </div>
                      </div>
                  </div>
                </div>

                <div class="panel search-filter-card exercise-database-toolbar filters-toolbar">
                  <div class="panel-body search-filter-body">
                      <button class="filter-accordion-toggle" @click="filtersOpen = !filtersOpen" :aria-expanded="filtersOpen">
                        <span class="filter-toggle-label"><i class="fa-solid fa-sliders filter-toggle-main-icon" aria-hidden="true"></i><span>{{ filtersOpen ? 'Hide Filters' : 'Show Filters' }}</span></span>
                      </button>

                      <div class="filter-body-animated" :class="{ 'filters-mobile-hidden': !filtersOpen }">
                      <div class="search-filter-grid">
                        <div class="search-filter-field search-filter-field--select">
                          <label class="form-label">View</label>
                          <div class="search-filter-select-wrap">
                            <select v-model="exerciseView" class="form-select">
                              <option value="all">All Exercises</option>
                              <option value="mine">My Exercises</option>
                              <option value="favorites">Favorite Exercises</option>
                            </select>
                            <i class="fa-solid fa-chevron-down search-filter-select-icon" aria-hidden="true"></i>
                          </div>
                        </div>

                        <div class="search-filter-field search-filter-field--select">
                          <label class="form-label">Exercise Type / Category</label>
                          <div class="search-filter-select-wrap">
                            <select v-model="workoutType" class="form-select">
                              <option value="All">All</option>
                              <option value="Strength">Strength</option>
                              <option value="Cardio">Cardio</option>
                              <option value="Other">Other</option>
                            </select>
                            <i class="fa-solid fa-chevron-down search-filter-select-icon" aria-hidden="true"></i>
                          </div>
                        </div>

                        <div class="search-filter-field search-filter-field--select">
                          <label class="form-label">Body Area / Muscle Group</label>
                          <div class="search-filter-select-wrap">
                            <select v-model="selectedMuscleGroup" class="form-select">
                              <option v-for="group in muscleGroups" :key="group" :value="group">
                                {{ group }}
                              </option>
                            </select>
                            <i class="fa-solid fa-chevron-down search-filter-select-icon" aria-hidden="true"></i>
                          </div>
                        </div>

                        <div class="search-filter-field search-filter-field--select">
                          <label class="form-label">Equipment</label>
                          <div class="search-filter-select-wrap">
                            <select v-model="selectedEquipment" class="form-select">
                              <option v-for="equip in equipmentList" :key="equip" :value="equip">
                                {{ equip }}
                              </option>
                            </select>
                            <i class="fa-solid fa-chevron-down search-filter-select-icon" aria-hidden="true"></i>
                          </div>
                        </div>
                      </div>

                        <div class="search-filter-actions">
                          <button class="btn btn-outline-secondary clear-filters-btn" @click="clearFilters" title="Reset filters">
                            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
                            <span>Clear Filters</span>
                          </button>
                        </div>
                      <div class="search-filter-divider"></div>
                      </div>
                  </div>
                </div>

                <!--End of Panel-->




              <!-- Exercise Results container -->
        
                <div class="panel exercise-results-panel">

                    <!--edit Excerise-->
                    <div v-if="showEditForm" class="row g-3 mt-3">
                      <div id="editExerciseForm" class="panel edit-exercise-panel col-12">
                            <div class="panel-header">
                              <h4>Edit Exercise</h4>
                            </div>
                            <div class="panel-body row g-3">
                              <div class="col-md-12">
                                  <label class="form-label">Exercise Name: <span style="color:red">*</span></label>
                                  <input v-model="editExercise.ExerciseTitle" class="form-control" required />
                              </div>
                              <div class="col-md-6">
                                  <label class="form-label">Workout Type: <span style="color:red">*</span></label>
                                  <select v-model="editExercise.WorkoutType" class="form-select" required>
                                    <option v-for="type in workoutTypeOptions" :key="type" :value="type">{{ type }}</option>
                                  </select>
                              </div>
                              <div class="col-md-6">
                                  <label class="form-label">Recording Type:</label>
                                  <select v-model="editExercise.RecordingType" class="form-select">
                                    <option v-for="type in recordingTypeOptions" :key="type" :value="type">{{ type }}</option>
                                  </select>
                              </div>
                              <div class="col-md-6">
                                  <label class="form-label">Equipment:</label>
                                  <input v-model="editExercise.Equipment" class="form-control" />
                              </div>
                              <div class="col-md-6">
                                  <label class="form-label">Muscle Group:<span style="color:red">*</span></label>
                                  <select v-model="editExercise.MuscleGroup" class="form-select" required>
                                    <option v-for="group in muscleGroups" :key="group" :value="group">{{ group }}</option>
                                  </select>
                              </div>
                              <div class="col-md-12">
                                  <label class="form-label">Upload Images (max 2):</label>
                                  <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    @change="handleImageUpload"
                                    class="form-control"
                                    :disabled="imagePreviews.length + existingImages.length >= 2"
                                  />
                                  <div class="mt-2 d-flex gap-2 flex-wrap">
                                    <template v-for="(img, index) in imagePreviews" :key="'new-edit-' + index">
                                      <div class="mb-2 position-relative">
                                        <img :src="img" style="max-width: 200px; border: 1px solid #ccc; border-radius: 12px;" />
                                        <span @click="removeNewImage(index)" style="position:absolute;top:0;right:0;color:red;cursor:pointer;font-size:3em;">&times;</span>
                                      </div>
                                    </template>
                                    <template v-for="(img, index) in existingImages" :key="'exist-edit-' + index">
                                      <div class="mb-2 position-relative">
                                        <img :src="getExerciseImage({ ExerciseID: editExercise.ExerciseID, PrimaryImage: img, ImageGallery: [img] })" style="max-width: 200px; border: 1px solid #ccc; border-radius: 12px;" />
                                        <span @click="removeExistingImage(img)" style="position:absolute;top:0;right:0;color:red;cursor:pointer;font-size:3em;">&times;</span>
                                        <div class="small text-center">{{ img.split('/').pop() }}</div>
                                      </div>
                                    </template>
                                  </div>
                              </div>
                              <div class="col-md-12">
                                  <label class="form-label">Instructions</label>
                                  <textarea v-model="editExercise.Instructions" class="form-control instructions" rows="=3" />
                              </div>
                              <div class="col-md-12" v-if="isAdminUser">
                                <div class="form-check mt-2">
                                  <input id="edit-global-toggle" v-model="editExercise.CreateAsGlobalExercise" class="form-check-input" type="checkbox" />
                                  <label for="edit-global-toggle" class="form-check-label">Create as Global Exercise</label>
                                </div>
                              </div>
                              <!-- Cardio Fields 
                                  <div class="col-md-12">
                                    <hr><h4>Cardio</h4><hr>
                                    
                                  </div>
                                  <div class="col-md-4">
                                    <label class="form-label">Duration (min)</label>
                                    <input type="number" v-model.number="editExercise.Duration" class="form-control" />
                                  </div>
                                  <div class="col-md-4">
                                    <label class="form-label">Calories</label>
                                    <input type="number" v-model.number="editExercise.Calories" class="form-control" />
                                  </div>
                                  <div class="col-md-3">
                                    <label class="form-label">Distance (miles)</label>
                                    <input type="number" v-model.number="editExercise.Distance" class="form-control" />
                                  </div>
                                  <div class="col-md-3">
                                    <label class="form-label">Speed (mph)</label>
                                    <input type="number" v-model.number="editExercise.Speed" class="form-control" />
                                  </div>
                                  <div class="col-md-3">
                                    <label class="form-label">Laps/Reps</label>
                                    <input type="number" v-model.number="editExercise['Laps-Reps']" class="form-control" />
                                  </div>
                                  -->

                              <!-- Error and Success Messages -->
                              <div v-if="updateError" class="col-12">
                                <div class="alert alert-danger d-flex align-items-center" role="alert">
                                  <i class="fa-solid fa-circle-exclamation me-2"></i>
                                  <div>{{ updateError }}</div>
                                </div>
                              </div>
                              <div v-if="updateSuccess" class="col-12">
                                <div class="alert alert-success d-flex align-items-center" role="alert">
                                  <i class="fa-solid fa-circle-check me-2"></i>
                                  <div>{{ updateSuccess }}</div>
                                </div>
                              </div>

                              <div class="col-12 mt-3 d-flex align-items-center" style="gap: 8px;">
                                  <div>
                                    <button class="btn btn-success" @click="saveEditedExercise" :disabled="isSaving">
                                      <span v-if="isSaving">
                                        <i class="fa-solid fa-spinner fa-spin me-1"></i> Saving...
                                      </span>
                                      <span v-else>Save Changes</span>
                                    </button>
                                    <button class="btn btn-outline-secondary ms-2" @click="showEditForm = false" :disabled="isSaving">Cancel</button>
                                  </div>
                                  <div class="ms-auto">
                                    <button v-if="Number(editExercise.CanDelete || 0) === 1 || isAdminUser" class="btn btn-danger" @click="deleteExercise(editExercise)" style="background-color: #e53935; color: #fff; min-width: 140px;">Delete Exercise</button>
                                  </div>
                              </div>

                            </div>
                        </div>
                    </div>
                    <!-- Edit Excerise-->
                <!--add Excerise-->
            
                      <div v-if="showAddForm" class="row g-3 mt-3">

                        <div id="customExerciseForm" class="panel mt-2 custom-exercise-form-panel">
  <div class="panel-header">
    <h4>{{ creatingGlobalExercise ? 'Add Global Exercise' : 'Add Custom Exercise' }}</h4>
  </div>
  <div class="panel-body row g-3">
    <div class="col-md-12 custom-exercise-field-row">
      <div v-if="addFormError" class="alert alert-danger mb-2">{{ addFormError }}</div>
      <label class="form-label">Exercise Name <span style="color:red">*</span></label>
      <input v-model="newExercise.ExerciseTitle" class="form-control" required />
    </div>

    <div class="col-md-12 custom-exercise-field-row">
      <label class="form-label">Workout Type <span style="color:red">*</span></label>
      <select v-model="newExercise.WorkoutType" class="form-select" required>
        <option v-for="type in workoutTypeOptions" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div class="col-md-12 custom-exercise-field-row">
      <label class="form-label">Recording Type</label>
      <select v-model="newExercise.RecordingType" class="form-select">
        <option v-for="type in recordingTypeOptions" :key="type" :value="type">{{ type }}</option>
      </select>
    </div>

    <div class="col-md-12 custom-exercise-field-row">
      <label class="form-label">Equipment</label>
      <input v-model="newExercise.Equipment" class="form-control" />
    </div>

    <div class="col-md-12 custom-exercise-field-row">
      <label class="form-label">Muscle Group <span style="color:red">*</span></label>
      <select v-model="newExercise.MuscleGroup" class="form-select" required>
        <option v-for="group in muscleGroups" :key="group" :value="group">{{ group }}</option>
      </select>
    </div>

    <!-- Add this inside your Add Exercise form component -->
<div class="col-md-12 custom-exercise-upload-section">
  <h6>Upload Images (max 2).</h6>
  <label class="form-label">Only image files are allowed (jpeg, jpg, png, gif, webp)</label>
  <input 
    type="file" 
    multiple 
    accept="image/*" 
    @change="handleImageUpload"
    class="form-control"
    :disabled="imagePreviews.length + existingImages.length >= 2"
  />
  <div class="mt-2 d-flex gap-2 custom-exercise-image-previews">
    <div v-for="(img, index) in imagePreviews" :key="'new-' + index" class="mb-2 position-relative custom-exercise-image-preview">
      <img :src="img" class="custom-exercise-preview-image" />
      <span @click="removeNewImage(index)" style="position:absolute;top:0;right:0;color:red;cursor:pointer;font-size:3em;">&times;</span>
    </div>
    <div v-for="(img, index) in existingImages" :key="'exist-' + index" class="mb-2 position-relative custom-exercise-image-preview">
      <img :src="getExerciseImage({ ExerciseID: newExercise.ExerciseID, PrimaryImage: img, ImageGallery: [img] })" class="custom-exercise-preview-image" />
      <span @click="removeExistingImage(img)" style="position:absolute;top:0;right:0;color:red;cursor:pointer;font-size:3em;">&times;</span>
      <div class="small text-center">{{ img.split('/').pop() }}</div>
    </div>
  </div>
</div>










    <div class="col-md-12 custom-exercise-field-row custom-exercise-field-row--multiline">
      <label class="form-label">Instructions</label>
      <textarea v-model="newExercise.Instructions" class="form-control instructions" rows="3" />
    </div>

    <div class="col-md-12">
      <p class="mb-0" data-testid="exercise-creation-scope">
        {{ creatingGlobalExercise ? 'This exercise will be available as a Global Exercise.' : 'This exercise will be saved to My Custom Exercises.' }}
      </p>
    </div>

    <div class="col-12 mt-3 custom-exercise-form-actions">
      <button class="btn btn-primary custom-exercise-create-button" @click="AddWorkout">Add Exercise</button>
      <button class="btn btn-outline-secondary ms-2 custom-exercise-cancel-button" @click="closeAddExercise">Cancel</button>
    </div>
  </div>
</div>
                    </div>
                    <!-- ADD Excerise-->





                      <!--LIST VIEW-->
                      <div class="row g-3 mt-2">
                        <div class="results-header-row">
                          <span class="results-title">Exercise Results</span>
                          <div class="results-header-actions">
                            <div class="results-display-toggle" role="group" aria-label="Exercise results display mode">
                              <button
                                type="button"
                                class="results-display-btn"
                                :class="{ 'results-display-btn--active': resultsDisplayMode === 'list' }"
                                @click="resultsDisplayMode = 'list'"
                                :aria-pressed="resultsDisplayMode === 'list'"
                                title="List view"
                              >
                                <i class="fa-solid fa-list" aria-hidden="true"></i>
                                <span>List</span>
                              </button>
                              <button
                                type="button"
                                class="results-display-btn"
                                :class="{ 'results-display-btn--active': resultsDisplayMode === 'grid' }"
                                @click="resultsDisplayMode = 'grid'"
                                :aria-pressed="resultsDisplayMode === 'grid'"
                                title="Grid view"
                              >
                                <i class="fa-solid fa-table-cells" aria-hidden="true"></i>
                                <span>Grid</span>
                              </button>
                            </div>
                            <label class="rows-per-page-control" for="rowsPerPageSelect">
                              <span class="rows-per-page-label">Rows per page:</span>
                              <select
                                id="rowsPerPageSelect"
                                v-model.number="itemsPerPage"
                                class="form-select rows-per-page-select"
                                @change="onRowsPerPageChange"
                              >
                                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                              </select>
                            </label>
                            <span class="results-count">{{ searchResultTotal }} items</span>
                            <button v-if="isAdminUser" class="btn btn-primary exercise-toolbar-add" @click="openAddExercise({ global: true })">
                              <i class="fa-solid fa-plus" aria-hidden="true"></i>
                              <span>Add Exercise</span>
                            </button>
                          </div>
                        </div>

                        <div class="exercise-list" :class="{ 'exercise-list--grid': resultsDisplayMode === 'grid' }">
                            <div class="exercise-row" v-for="ex in pagedExercises" :key="ex.ExerciseID">
                              <div class="exercise-img">
                                  <img
                                    :src="getFirstImage(ex.ImageGallery, ex.ExerciseID)"
                                    @click="selectExerciseFromList(ex)"
                                    class="clickable"
                                  />
                              </div>

                              <div class="exercise-info">
                                  <h5 class="exercise-title">{{ ex.ExerciseTitle }}</h5>

                                  <div class="exercise-meta">
                                    <p class="exercise-meta-inline">{{ ex.WorkoutType }}<span class="meta-dot"> • </span>{{ ex.MuscleGroup }}<span class="meta-dot"> • </span>{{ ex.Equipment }}</p>
                                    <p class="exercise-meta-inline" v-if="Number(ex.IsGlobalExercise || 0) === 1">Global exercise</p>
                                    <p class="exercise-meta-inline" v-else>Custom exercise</p>
                                  </div>

                                  <div class="exercise-actions">
                                    <button
                                      :class="['btn', 'btn-sm', 'btn-fav', isFavoriteExercise(ex.ExerciseID) && 'btn-fav--active']"
                                      @click="toggleFavoriteExercise(ex)"
                                    >
                                      <i v-if="isFavoriteExercise(ex.ExerciseID)" class="fa-solid fa-heart"></i>
                                      {{ isFavoriteExercise(ex.ExerciseID) ? 'Unfav' : 'Fav' }}
                                    </button>
                                    <button v-if="Number(ex.CanEdit || 0) === 1 || isAdminUser" class="btn btn-sm btn-edit-exercise" @click="startEditing(ex)">
                                      Edit Exercise
                                    </button>
                                  </div>
                              </div>
                            </div>

                            <div class="pagination-row">
                              <button class="btn btn-outline-secondary pagination-btn" @click="prevPage" :disabled="currentPage === 1">Prev</button>
                                <span class="pagination-info">Page {{ currentPage }} / {{ searchTotalPages }}</span>
                              <button class="btn btn-outline-dark pagination-btn" @click="nextPage"
                                  :disabled="currentPage >= searchTotalPages">Next</button>
                            </div>

                            <div class="results-bottom-actions">
                              <button v-if="isAdminUser" class="btn btn-primary exercise-toolbar-add" @click="openAddExercise({ global: true })">
                                <i class="fa-solid fa-plus" aria-hidden="true"></i>
                                <span>Add Exercise</span>
                              </button>
                            </div>
                        </div>
                      </div>
                      <!--LIST VIEW-->



                   

        
                  <!--end of WorkoutList-->
                  <!--End of panel body-->

              </div>
              <!-- /exercise-results-panel -->
            </div>
            <!-- /container-block -->
          </div>
          <!-- /search-exercises tab -->

          <!-- Favorite Exercises Section -->
  <div v-if="activeTab === 'favorite-exercises'" class="favorites-section">
    <div class="container container-block">
      <div class="panel search-filter-card favorites-panel">
        <div class="panel-header search-filter-head">
          <h3 class="m-0">Favorite Exercises</h3>
        </div>
        <div class="panel-body">
          <!-- Loading State -->
          <div v-if="loadingFavorites" class="text-center py-5">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem; margin-bottom: 1rem;">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p style="color: #64748b; font-size: 1rem;">Loading your favorites...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="favoritesLoadError" class="text-center py-5">
            <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
            <p style="color: #dc3545; font-size: 1rem; font-weight: 600;">Error loading favorite exercises. Please try again.</p>
            <button class="btn btn-primary mt-2" @click="loadFavoriteExercises()">Try Again</button>
          </div>

          <!-- Empty State -->
          <div v-else-if="favoriteExercises.length === 0" class="text-center py-5">
            <i class="fa-solid fa-heart" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
            <p style="color: #64748b; font-size: 1rem;">
              No favorite exercises yet. Favorite exercises from the Search Exercises tab to see them here.
            </p>
          </div>

          <!-- Favorite Exercises List -->
          <div v-else class="row favorites-grid">
            <div v-for="ex in favoriteExercises" :key="ex.ExerciseID" class="col-sm-6 col-lg-4 col-xl-3 mb-4 favorite-exercise-item">
              <div class="exercise-card favorite-exercise-card">
                <div class="exercise-image">
                  <img
                    :src="getExerciseImage(ex)"
                    :alt="ex.ExerciseTitle"
                    class="img-fluid"
                    loading="lazy"
                    @error="$event.target.src = DEFAULT_EXERCISE_IMAGE"
                  />
                </div>
                <div class="exercise-content favorite-exercise-content">
                  <h5 class="exercise-title">{{ ex.ExerciseTitle }}</h5>
                  <div class="exercise-meta favorite-exercise-badges">
                    <span class="badge favorite-exercise-badge favorite-exercise-badge--type">{{ ex.WorkoutType }}</span>
                    <span class="badge favorite-exercise-badge favorite-exercise-badge--muscle">{{ ex.MuscleGroup }}</span>
                    <span class="badge favorite-exercise-badge favorite-exercise-badge--equipment">{{ ex.Equipment }}</span>
                  </div>
                </div>
                <div class="exercise-actions favorite-exercise-action">
                  <button
                    class="btn btn-sm btn-fav btn-fav--active favorite-exercise-toggle"
                    @click="toggleFavoriteExercise(ex)"
                  >
                    <i class="fa-solid fa-heart"></i> Unfav
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Log Exercise Section -->
  <div v-if="activeTab === 'log-exercise'">

  <div class="container container-block">
    <div class="panel">
      <div class="panel-header d-flex justify-content-between align-items-center">
        <h4>My Custom Exercises</h4>
        <button class="btn btn-sm btn-primary custom-exercise-create-button" @click="openAddExercise({ global: false })">+ Create Exercise</button>
      </div>
      <div class="panel-body">
        <div v-if="customExercisesLoadError" class="alert alert-warning">{{ customExercisesLoadError }}</div>
        <div v-else-if="myCustomExercises.length === 0" class="text-center py-4">
          <p class="mb-2">No custom exercises created yet.</p>
          <p class="text-muted mb-3">Create your first custom exercise to personalize your workouts.</p>
        </div>
        <div v-else class="exercise-list">
          <div class="exercise-row" v-for="myEx in myCustomExercises" :key="`mine-${myEx.ExerciseID}`">
            <div class="exercise-img">
              <img :src="getFirstImage(myEx.ImageGallery, myEx.ExerciseID)" class="clickable" @click="selectExerciseForLog(myEx)" />
            </div>
            <div class="exercise-info">
              <h5 class="exercise-title">{{ myEx.ExerciseTitle }}</h5>
              <div class="exercise-meta">
                <p class="exercise-meta-inline">{{ myEx.WorkoutType }}<span class="meta-dot"> • </span>{{ myEx.MuscleGroup }}<span class="meta-dot"> • </span>{{ myEx.Equipment }}</p>
              </div>
              <div class="exercise-actions">
                <button class="btn btn-sm btn-primary" @click="selectExerciseForLog(myEx)">Use in Log</button>
                <button v-if="Number(myEx.CanEdit || 0) === 1 || isAdminUser" class="btn btn-sm btn-outline-secondary" @click="startEditing(myEx)">Edit Exercise</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


  <!--Log Excerise container -->
  <div class="container container-block">
         <div class="panel">
            <!--Start of panel-->

            <div v-if="addError" class="alert alert-danger mt-2">
            {{ addError }}
            </div>

            <div class="panel-header">
              <h4>Log Excerise</h4>
            </div>

            <div class="panel-body">
              <div class="search-filter-grid">
                <div class="search-filter-field full-width">
                  <label class="form-label">Search Exercise For Log</label>
                  <input
                    v-model="logSearchExercise"
                    class="form-control"
                    placeholder="Search as you type"
                    @keydown="onLogSearchKeydown"
                  />
                </div>
                <div class="search-filter-field">
                  <label class="form-label">Workout Type</label>
                  <select v-model="logWorkoutTypeFilter" class="form-select">
                    <option value="All">All</option>
                    <option value="Strength">Strength</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="search-filter-field">
                  <label class="form-label">Muscle Group</label>
                  <select v-model="logMuscleGroupFilter" class="form-select">
                    <option v-for="group in muscleGroups" :key="`log-group-${group}`" :value="group">{{ group }}</option>
                  </select>
                </div>
                <div class="search-filter-field">
                  <label class="form-label">Equipment</label>
                  <select v-model="logEquipmentFilter" class="form-select">
                    <option v-for="equip in equipmentList" :key="`log-equip-${equip}`" :value="equip">{{ equip }}</option>
                  </select>
                </div>
                <div class="search-filter-field">
                  <label class="form-label">Library</label>
                  <select v-model="logOwnershipFilter" class="form-select">
                    <option value="all">All</option>
                    <option value="global">Global Exercises</option>
                    <option value="custom">My Custom Exercises</option>
                  </select>
                </div>
              </div>

              <div class="exercise-list mt-3" v-if="logExerciseMatches.length">
                <div
                  class="exercise-row"
                  v-for="(match, index) in logExerciseMatches"
                  :key="`log-match-${match.ExerciseID}`"
                  :class="{ 'exercise-row--active': index === logSuggestionIndex }"
                  @click="selectExerciseForLog(match)"
                >
                  <div class="exercise-img">
                    <img :src="getFirstImage(match.ImageGallery, match.ExerciseID)" class="clickable" />
                  </div>
                  <div class="exercise-info">
                    <h5 class="exercise-title">{{ match.ExerciseTitle }}</h5>
                    <p class="exercise-meta-inline">{{ match.WorkoutType }}<span class="meta-dot"> • </span>{{ match.MuscleGroup }}<span class="meta-dot"> • </span>{{ match.Equipment }}</p>
                  </div>
                </div>
              </div>
            </div>


            <!-- Strength / Cardio Inputs -->
            <div id="log-workout-form" class="row g-3 mt-3" v-if="selectedExercise">
               
               <!--Workout Excerise-->
               <div class="col-md-4">
                 <img
                   v-if="selectedImage !== 'fallback.jpg'"
                   :src="selectedImage"
                   alt="Selected Exercise"
                   class="img-fluid workout-log-img"
                 />
               </div>
               <!--End of Workout Excerise-->

               <div class="col-md-8">
                 <h5><b>Selected Excerise Name: </b> {{ selectedExercise }}</h5>
                 <div v-if="selectedExercise" class="d-flex align-items-center mb-2">
                   <div class="sel-ex-input"><strong>Muscle Group: </strong>
                   
                     {{
                       (allExercises.find(ex => ex.ExerciseTitle === selectedExercise) && allExercises.find(ex => ex.ExerciseTitle === selectedExercise).MuscleGroup) || 'N/A'
                     }}
                   </div>
                 </div>


                 <!-- Strength Fields -->
                 <div v-if="selectedExercise && (allExercises.find(ex => ex.ExerciseTitle === selectedExercise)?.WorkoutType === 'Strength')">
                   <div class="d-flex align-items-center mb-2">
                     <div class="sel-ex-input">Weight (lbs):</div>
                     <input v-model.number="exercise.weight" type="number" class="form-control ms-2" min="1" />
                   </div>
                   <div class="d-flex align-items-center mb-2">
                     <div class="sel-ex-input">Reps:</div>
                     <input v-model.number="exercise.reps" type="number" class="form-control ms-2" min="1" />
                   </div>
                   <div class="d-flex align-items-center">
                     <div class="sel-ex-input">Sets:</div>
                     <input v-model.number="exercise.sets" type="number" class="form-control ms-2" min="1" />
                   </div>
                 </div>

                 <!-- Cardio Fields (hide if Strength) -->
                 <div v-if="selectedExercise && (allExercises.find(ex => ex.ExerciseTitle === selectedExercise)?.WorkoutType !== 'Strength')">
                   <div class="d-flex">
                     <div class="sel-ex-input">Distance (mi):</div>
                     <div>
                       <input v-model.number="exercise.distance" type="number" class="form-control" min="0" step="0.01" />
                     </div>
                   </div>
                   <div class="d-flex">
                     <div class="sel-ex-input">Laps-Rep:</div>
                     <div>
                       <input v-model.number="exercise.lapsRep" type="number" class="form-control" min="0" />
                     </div>
                   </div>
                   <div class="d-flex">
                     <div class="sel-ex-input">Calories:</div>
                     <div>
                       <input v-model.number="exercise.calories" type="number" class="form-control" min="0" />
                     </div>
                   </div>
                   <div class="d-flex">
                     <div class="sel-ex-input">Speed (mph):</div>
                     <div>
                       <input v-model.number="exercise.speed" type="number" class="form-control" min="0" step="0.01" />
                     </div>
                   </div>
                 </div>

                 <!-- Duration Timer (Always show in log-exercise tab) -->
                 <div v-if="activeTab === 'log-exercise'" class="d-flex align-items-center mt-2">
                   <div class="sel-ex-input">Duration (min):</div>
                   <div class="input-group">
                     <input v-model.number="exercise.duration" type="number" class="form-control" min="0" />
                     <button class="btn btn-outline-secondary ms-2" type="button" @click="toggleStopwatch">{{ stopwatchRunning ? 'Stop' : 'Start' }}</button>
                     <span class="ms-2">{{ formattedStopwatch }}</span>
                     <button v-if="stopwatchRunning || stopwatchTime > 0" class="btn btn-outline-danger ms-2" type="button" @click="resetStopwatch">Reset</button>
                   </div>
                 </div>


                 <!-- Add Exercise Button -->
                 <div class="d-flex">
                   <button class="btn btn-secondary" @click="activeTab = 'search-exercises'">Back to excerise list.</button>
                   <button @click="addExercise" class="btn btn-primary">Log Exercise</button>
                 </div>
               </div>

            </div><!--End of rightColumn-->

            <div id="log-workout-form" class="row g-3 mt-3" v-if="!selectedExercise">
              <div class="col-md-4">
 <button class="btn btn-secondary" @click="activeTab = 'search-exercises'">Select excerise.</button>
              </div>
              <div class="col-md-8">
Please Select an excerise
              </div>
              
            </div>

            
            <!--End of row-->

           
         </div>
</div>


<!-- Workout Log Panel -->
<div class="container mt-8 container-block">
  <div class="panel">

    <!-- Workout Log -->
    <div class="panel-header">
      <h4>Workout Log</h4>
      <!-- Summary header below Workout Log header -->
      <div class="workout-log-summary" style="margin-top: 6px; margin-bottom: 10px; font-size: 1rem; font-weight: 500;">
        Exercises Completed: {{ combinedWorkoutLogs.length }}<br />
        Date: {{ selectedDate }}
      </div>
    </div>
    <div class="panel-body">


<!-- Workout Log Table (Header) -->
<div class="row font-weight-bold" style="display: flex;">
  <div style="flex-basis: 20%; max-width: 20%;">Excerise:</div>
  <div style="flex-basis: 70%; max-width: 70%;">Info</div>
  <div style="flex-basis: 10%; max-width: 10%;">Action</div>
</div>
<!-- Workout Log Table (Rows) -->
<div class="list-group-item d-flex align-items-start" v-for="(log, idx) in combinedWorkoutLogs" :key="log.WorkoutLogID || log.id || idx" style="display: flex; align-items: flex-start;">
  <!-- Exercise Name and Image (20%) -->
  <div style="flex-basis: 20%; max-width: 20%; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; padding-right: 15px;">
    <div class="logged-exercise-title" style="font-weight: bold; font-size: 0.92rem; margin-bottom: 4px; line-height: 1.1;">{{ log.name || log.ExerciseTitle }}</div>
    <img
      :src="log.image || getFirstImage(log.ImageGallery, log.ExerciseID)"
      class="summary-img me-3 img-fluid"
      style="width: 100%; height: auto; max-width: 100%; object-fit: cover; border-radius: 8px; margin-left: 0; align-self: flex-start; vertical-align: top;"
    />
  </div>
  <!-- Info (70%) -->
  <div style="flex-basis: 70%; max-width: 70%;">
    <div class="row">
      <!-- Sub-column 1: Reps, Sets, Weight, Duration -->
      <div class="col-6">
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Reps:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log.reps" class="form-control" placeholder="Reps" />
            </template>
            <template v-else>
              <span>{{ log.reps }}</span>
            </template>
          </div>
        </div>
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Sets:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log.sets" class="form-control" placeholder="Sets" />
            </template>
            <template v-else>
              <span>{{ log.sets }}</span>
            </template>
          </div>
        </div>
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Weight:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log.weight" class="form-control" placeholder="Weight" />
            </template>
            <template v-else>
              <span>{{ log.weight }}</span>
            </template>
          </div>
        </div>
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Duration:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log.duration" class="form-control" placeholder="Duration" />
            </template>
            <template v-else>
              <span>{{ log.duration }}</span>
            </template>
          </div>
        </div>
      </div>
      <!-- Sub-column 2: Calories, Distance, Speed -->
      <div class="col-6">
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Calories:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log.calories" class="form-control" placeholder="calories" />
            </template>
            <template v-else>
              <span>{{ log.calories }}</span>
            </template>
          </div>
        </div>
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Distance:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log.distance" class="form-control" placeholder="distance" />
            </template>
            <template v-else>
              <span>{{ log.distance }}</span>
            </template>
          </div>
        </div>
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Speed:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log.speed" class="form-control" placeholder="speed" />
            </template>
            <template v-else>
              <span>{{ log.speed }}</span>
            </template>
          </div>
        </div>
        <div class="row align-items-center mb-2">
          <div class="fw-bold" style="width:30%;min-width:60px;">Laps-Rep:</div>
          <div style="width:70%">
            <template v-if="rowEditState[idx]">
              <input v-model="log['Laps-Rep']" class="form-control" placeholder="Laps-Rep" />
            </template>
            <template v-else>
              <span>{{ log['Laps-Rep'] }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
   <p></p>
  </div>
  <!-- Actions (10%) -->
  <div style="flex-basis: 10%; max-width: 10%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <!-- Edit (pen) icon: show only if not in edit mode for this row -->
    <button v-if="!rowEditState[idx]" @click="editLog(log, idx)" class="btn btn-sm mb-2 log-action-btn" title="Edit" style="background-color: #6c757d; border-color: #6c757d;">
      <i class="fas fa-pen log-action-icon" style="color: #fff;"></i>
    </button>
    <!-- Save (disk) icon: show only if in edit mode for this row -->
    <button v-if="rowEditState[idx]" @click="updateLog(log, idx)" class="btn btn-sm mb-2 log-action-btn" title="Save" style="background-color: #e53935; border-color: #e53935; color: #fff;">
      <i class="fas fa-save log-action-icon"></i>
    </button>
    <button @click="removeLog(log, idx)" class="btn btn-sm btn-danger log-action-btn"><span class="log-action-icon" style="display:inline-block; line-height:1;">ðŸ—‘ï¸</span></button>
  </div>
</div>
<!-- End of Log -->

      

      

    </div>
    <!-- Save Workout-->
       <button 
            @click="saveWorkout" 
            class="btn btn-success" 
            :disabled="!userId || workoutList.length === 0">
            Save Workouts
          </button>  
        <!--End of Save Workout-->  
  </div>
</div>





  </div><!--end ofLog Exercise Section-->
</div><!-- End of tab-content -->
</div><!-- End of ex-page-body: Exercise Section -->
  </div>
  </div>
</template>
<style scoped>
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   BASE / DESKTOP
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.exercises-page {
  display: block;
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: #0b1320;
}

.custom-exercise-create-button {
  background: var(--wa-action-blue, #2f6bff) !important;
  border-color: var(--wa-action-blue, #2f6bff) !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.custom-exercise-create-button:hover,
.custom-exercise-create-button:focus {
  background: var(--wa-action-blue-hover, #2459d8) !important;
  border-color: var(--wa-action-blue-hover, #2459d8) !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.custom-exercise-form-panel .panel-body {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  overflow-x: hidden;
  --bs-gutter-x: 16px;
  --bs-gutter-y: 8px;
}

.custom-exercise-field-row {
  display: grid;
  grid-template-columns: minmax(88px, 34%) minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.custom-exercise-field-row > .alert {
  grid-column: 1 / -1;
}

.custom-exercise-field-row .form-label {
  min-width: 0;
  margin: 0;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.2;
}

.custom-exercise-field-row .form-control,
.custom-exercise-field-row .form-select {
  width: 100%;
  min-width: 0;
  min-height: 40px;
}

.custom-exercise-field-row--multiline {
  align-items: start;
}

.custom-exercise-field-row--multiline .form-label {
  padding-top: 10px;
}

.custom-exercise-field-row--multiline .instructions {
  min-height: 96px;
  resize: vertical;
}

.custom-exercise-upload-section {
  min-width: 0;
  overflow: hidden;
}

.custom-exercise-upload-section h6 {
  margin: 0 0 2px;
}

.custom-exercise-upload-section .form-label {
  display: block;
  width: 100%;
  max-width: 100%;
  margin-bottom: 5px;
  font-size: 0.72rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.custom-exercise-upload-section input[type="file"] {
  width: 100%;
  min-width: 0;
  font-size: 0.75rem;
}

.custom-exercise-image-previews {
  flex-wrap: wrap;
  max-width: 100%;
  overflow: hidden;
}

.custom-exercise-image-preview {
  width: min(150px, 100%);
  max-width: 100%;
}

.custom-exercise-preview-image {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.custom-exercise-form-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  padding-top: 10px;
  padding-bottom: 10px;
  background: var(--wa-panel-bg, #1b2444);
  border-top: 1px solid var(--wa-border, rgba(145, 160, 200, 0.24));
}

.custom-exercise-form-actions .btn {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 8px 6px;
  margin-left: 0 !important;
  font-size: 0.82rem;
  white-space: nowrap;
}

.exercises-canvas {
  display: grid;
  gap: 14px;
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.dashboard-breadcrumb {
  margin-bottom: 0;
  border-radius: 18px;
  border: 1px solid rgba(37, 99, 235, 0.3);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.dashboard-breadcrumb h2 {
  margin: 0;
  color: #ffffff;
  font-weight: 800;
  letter-spacing: -0.015em;
}

.header-meta {
  color: #cbd5e1;
  font-weight: 600;
  margin-right: 10px;
}

.panel-header h4 {
  margin: 0;
  color: var(--ex-text, #f8fafc);
  font-weight: 800;
}

.panel-body {
  color: var(--ex-text-secondary, #a4b0c0);
}

.exercise-card {
  min-height: 120px;
  background-color: var(--ex-surface-2, #17212d);
  border-radius: 10px;
}
.exercise-card .exercise-image {
  width: 75%;
  margin: 0 auto;
}
.exercise-card .exercise-image img {
  width: 100%;
  height: auto;
  border-radius: 9px;
  display: block;
}
.image-box {
  flex-shrink: 0;
}
.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.exercise-row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid rgba(145, 160, 200, 0.24);
  background: #1b2444;
  border-radius: 8px;
  align-items: center;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.exercise-row:hover {
  transform: translateY(-1px);
  border-color: rgba(145, 160, 200, 0.24);
  background: #1b2444;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.16);
}
.exercise-img img {
  width: 132px;
  height: 132px;
  object-fit: cover;
  border-radius: 8px;
}
.exercise-img {
  width: 132px;
  flex-shrink: 0;
}
.exercise-info {
  min-width: 0;
  display: grid;
  gap: 6px;
}
.exercise-title {
  font-weight: 800;
  font-size: 1rem;
  color: var(--ex-text, #f8fafc);
  margin: 0;
  padding: 0;
  border: 0;
}
.exercise-meta {
  display: grid;
  gap: 2px;
  margin-bottom: 4px;
}
.exercise-meta p {
  margin: 0;
  color: var(--ex-text-secondary, #a4b0c0);
  font-size: 0.86rem;
  line-height: 1.35;
}
.exercise-meta p span {
  color: var(--ex-text, #f8fafc);
  font-weight: 800;
  margin-right: 0;
}
.exercise-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 0;
}
.exercise-actions .btn {
  padding: 5px 10px;
  font-size: 0.8rem;
  border-radius: 7px;
  margin: 0;
}

.btn-fav {
  background: #dc2626;
  border: 1px solid #dc2626;
  color: #ffffff;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.btn-fav:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #ffffff;
}
.btn-fav--active {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}
.btn-fav--active .fa-heart {
  color: #ffffff;
}
.btn-fav--active:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #ffffff;
}

.btn-edit-exercise {
  background: var(--wa-action-blue, #2f6bff);
  border: 1px solid var(--wa-action-blue, #2f6bff);
  color: #ffffff;
}

.btn-edit-exercise:hover,
.btn-edit-exercise:focus-visible {
  background: var(--wa-action-blue-hover, #2459d8);
  border-color: var(--wa-action-blue-hover, #2459d8);
  color: #ffffff;
}

/* Edit Exercise Panel */
.edit-exercise-panel {
  border: 1px solid var(--ex-border, rgba(120, 145, 175, 0.16));
  border-radius: 12px;
  padding: 18px 20px;
  background: var(--ex-surface-2, #17212d);
  box-shadow: 0 10px 22px rgba(2, 6, 23, 0.16);
  margin-top: 20px !important;
}
.edit-exercise-panel .panel-header {
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--ex-border, rgba(120, 145, 175, 0.16));
}
.edit-exercise-panel .panel-header h4 {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ex-text, #f8fafc);
  margin: 0;
}
.edit-exercise-panel .form-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--ex-text-secondary, #a4b0c0);
  margin-bottom: 5px;
}
.edit-exercise-panel .form-control,
.edit-exercise-panel .form-select {
  min-height: 38px;
  border: 1px solid var(--ex-border-strong, rgba(120, 145, 175, 0.24));
  background: var(--ex-surface-1, #121923);
  color: var(--ex-text, #f8fafc);
  font-size: 0.9rem;
}
.edit-exercise-panel .form-control:focus,
.edit-exercise-panel .form-select:focus {
  border-color: color-mix(in srgb, var(--ex-accent, #3b82f6) 60%, var(--ex-border-strong) 40%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ex-accent, #3b82f6) 22%, transparent 78%);
}
.edit-exercise-panel .instructions {
  min-height: 150px;
}
.edit-exercise-panel .panel-body {
  padding: 0;
}

.instructions {
  min-height: 250px;
}
.container-block {
  margin-top: 0;
}
.container.container-block {
  max-width: 100% !important;
  width: 100% !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
.workout-log-img {
  height: 200px;
  width: 350px;
}
.sel-ex-input {
  min-width: 100px;
  padding-bottom: 10px;
}
textarea {
  resize: vertical;
}
.btn {
  margin: 2px;
}

.summary-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}
.clickable {
  cursor: pointer;
}

/* â”€â”€ Tab bar â”€â”€ */
.ex-page-body {
  width: 100%;
  padding: 14px;
  margin: 0;
  background: #1b2444;
  border: 1px solid rgba(145, 160, 200, 0.24);
  border-radius: 12px;
  box-shadow: 0 10px 26px rgba(2, 6, 23, 0.32);
  box-sizing: border-box;
  overflow-x: hidden;
}

.exercises-page .ex-page-body.app-section-card {
  background: #1b2444 !important;
  border-color: rgba(145, 160, 200, 0.24) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12) !important;
}

.ex-tab-bar {
  display: flex;
  padding: 6px;
  background: #1b2444;
  border: 1px solid rgba(145, 160, 200, 0.24);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
}

.ex-tab {
  flex: 1;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #1b2444;
  border: none;
  color: var(--ex-text-secondary, #a4b0c0);
  font-size: 0.92rem;
  font-weight: 600;
  padding: 10px 14px;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
  white-space: nowrap;
  border-radius: 3px;
}
/* design-system.css applies `button { border-radius: 999px !important }` site-wide
   (src/styles/design-system.css). Override it here using the same technique as
   WorkoutBuilder's `.builder-tabs .builder-tab` so tabs stay rectangular, not pill-shaped. */
.ex-tab-bar .ex-tab {
  border-radius: 3px !important;
}
.ex-tab:hover { color: rgba(255, 255, 255, 0.92); }
.ex-tab--active {
  color: #ffffff;
  font-weight: 700;
  background: #1d4f9f;
  box-shadow: inset 0 -2px 0 0 rgba(200, 221, 255, 0.95), 0 0 0 1px rgba(196, 220, 255, 0.28);
}
.exercises-page .ex-tab--active,
.exercises-page .ex-tab--active i,
.exercises-page .ex-tab--active span {
  color: #ffffff;
}

.exercises-page .ex-tab--active:hover,
.exercises-page .ex-tab--active:focus,
.exercises-page .ex-tab--active:focus-visible {
  background: #1d4f9f;
  color: #ffffff;
  box-shadow: inset 0 -2px 0 0 rgba(200, 221, 255, 0.95), 0 0 0 1px rgba(196, 220, 255, 0.28);
}
.ex-tab:focus,
.ex-tab:focus-visible {
  outline: none;
}
.ex-tab--active:focus,
.ex-tab--active:focus-visible {
  box-shadow: inset 0 -2px 0 0 rgba(200, 221, 255, 0.95), 0 0 0 1px rgba(196, 220, 255, 0.28);
}
.ex-tab i,
.ex-tab span { color: inherit; }

/* Short/full label logic â€“ desktop: show full only */
.tab-label-short { display: none; }
.tab-label-full  { display: inline; }

/* â”€â”€ Filter card â”€â”€ */
.search-filter-card {
  border-radius: 8px;
  border: 1px solid rgba(145, 160, 200, 0.24);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  padding: 0;
  background: #1b2444;
}

.search-filter-head { display: none; }
.search-filter-head h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--ex-text, #f8fafc);
}

.search-filter-body {
  padding: 8px 10px;
}

/* Filters accordion toggle */
.filter-accordion-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  background: #17213a;
  border: 1px solid rgba(145, 160, 200, 0.24);
  padding: 7px 12px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ex-text, #f8fafc);
  cursor: pointer;
  border-radius: 4px;
  margin: 0 0 6px;
  box-shadow: none !important;
  outline: none;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.filter-accordion-toggle:hover,
.filter-accordion-toggle:focus-visible {
  background: #1d2b4f;
  border-color: rgba(145, 160, 200, 0.34);
  box-shadow: none !important;
}

.filter-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ex-text, #f8fafc);
}

.filter-toggle-main-icon {
  font-size: 0.84rem;
  color: inherit;
}

/* Filter body animated collapse (mobile only) */
.filter-body-animated {
  max-height: 1600px;
  opacity: 1;
  overflow: hidden;
  transition: max-height .25s ease, opacity .2s ease;
}

.filter-body-animated.filters-mobile-hidden {
  max-height: 0 !important;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  pointer-events: none;
}

/* Inline meta */
.exercise-meta-inline {
  margin: 0;
  color: var(--ex-text-secondary, #a4b0c0);
  font-size: 0.86rem;
  line-height: 1.35;
}
.meta-dot { color: var(--ex-text-muted, #738196); }

/* Pagination row */
.pagination-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.pagination-btn { min-width: 72px; }
.pagination-row .pagination-btn {
  border-color: var(--wa-action-blue, #2f6bff) !important;
  background: var(--wa-action-blue, #2f6bff) !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.pagination-row .pagination-btn:hover,
.pagination-row .pagination-btn:focus-visible {
  border-color: var(--wa-action-blue-hover, #2459d8) !important;
  background: var(--wa-action-blue-hover, #2459d8) !important;
  color: #ffffff !important;
}

.pagination-row .pagination-btn:disabled,
.pagination-row .pagination-btn.disabled {
  border-color: rgba(103, 132, 214, 0.45) !important;
  background: rgba(47, 107, 255, 0.35) !important;
  color: rgba(255, 255, 255, 0.78) !important;
  opacity: 0.65;
}

.results-bottom-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.pagination-info {
  font-size: 0.86rem;
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
}

.search-filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 10px;
  align-items: end;
}
.search-filter-field.full-width { grid-column: 1 / -1; }
.search-filter-field .form-label {
  margin-bottom: 2px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--ex-text-secondary, #a4b0c0);
}
.search-filter-field .form-control,
.search-filter-field .form-select {
  min-height: 40px;
  padding: 8px 10px;
  font-size: 0.9rem;
  border: 1px solid var(--ex-border-strong, rgba(120, 145, 175, 0.24));
  background: #17213a;
  color: var(--ex-text, #f8fafc);
  border-radius: 6px;
}
.search-filter-field .form-control:focus,
.search-filter-field .form-select:focus {
  border-color: color-mix(in srgb, var(--ex-accent, #3b82f6) 60%, var(--ex-border-strong) 40%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ex-accent, #3b82f6) 22%, transparent 78%);
}

.search-filter-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
  flex-wrap: wrap;
}
.search-filter-divider { display: none; }

.exercise-database-toolbar {
  overflow: hidden;
  border: 1px solid rgba(145, 160, 200, 0.24);
  border-radius: 6px;
  background: #1b2444;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
}



.search-only-toolbar .search-filter-body {
  padding: 8px 10px;
}

.search-compact-row {
  display: block;
}

.search-filter-input-wrap--search-only {
  position: relative;
}

.search-filter-input-wrap--search-only .form-control {
  width: 100%;
  min-width: 0;
  height: 40px;
  min-height: 40px;
  padding: 8px 10px 8px 54px;
  border: 1px solid rgba(145, 160, 200, 0.24);
  border-radius: 6px !important;
  background-color: #17213a;
  color: var(--ex-text, #f8fafc);
  font-size: 0.88rem;
  line-height: 1.2;
}

.search-filter-input-wrap--search-only .form-control::placeholder {
  color: var(--ex-text-secondary, #a4b0c0);
}

.filters-toolbar .filter-accordion-toggle {
  margin-top: 0;
}

.exercises-page .panel.search-filter-card,
.exercises-page .panel.exercise-database-toolbar,
.exercises-page .panel.exercise-results-panel,
.exercises-page .tab-content .panel {
  background: #1b2444 !important;
  border-color: rgba(145, 160, 200, 0.24) !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12) !important;
}

.exercises-page .search-only-toolbar,
.exercises-page .filters-toolbar {
  border-radius: 6px !important;
}

.exercise-database-toolbar .search-filter-body {
  padding: 8px 10px;
}

.exercise-database-toolbar .search-filter-primary-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: end;
}

.exercise-database-toolbar .search-filter-primary-row .full-width {
  grid-column: auto;
}

.exercise-database-toolbar .search-filter-grid {
  gap: 10px;
  margin-top: 4px;
}

.exercise-database-toolbar .search-filter-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.exercise-database-toolbar .search-filter-field .form-label {
  margin: 0;
  color: var(--ex-text, #f8fafc);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.exercise-database-toolbar .search-filter-input-wrap,
.exercise-database-toolbar .search-filter-select-wrap {
  position: relative;
  width: 100%;
}

.exercise-database-toolbar .search-filter-input-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  color: var(--ex-text-muted, #738196);
  font-size: 0.82rem;
  line-height: 1;
  pointer-events: none;
}

.exercise-database-toolbar .search-filter-field--search .form-control {
  padding-left: 54px !important;
}

.exercise-database-toolbar .search-filter-select-wrap .form-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 34px;
  background-image: none;
}

.exercise-database-toolbar .search-filter-select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ex-text-muted, #738196);
  font-size: 0.72rem;
  pointer-events: none;
}

.exercise-database-toolbar .search-filter-field .form-control,
.exercise-database-toolbar .search-filter-field .form-select {
  width: 100%;
  min-width: 0;
  height: 40px;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid rgba(145, 160, 200, 0.24);
  border-radius: 6px !important;
  background-color: #17213a;
  color: var(--ex-text, #f8fafc);
  font-size: 0.88rem;
  line-height: 1.2;
}

.exercise-database-toolbar .search-filter-field .form-control::placeholder {
  color: var(--ex-text-secondary, #a4b0c0);
}

.exercise-database-toolbar .search-filter-field .form-control:focus,
.exercise-database-toolbar .search-filter-field .form-select:focus {
  border-color: rgba(145, 160, 200, 0.24);
  box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.24);
}

.exercise-database-toolbar .search-filter-actions {
  flex-wrap: nowrap;
  margin: 0;
  align-items: flex-end;
  gap: 8px;
}

.exercise-database-toolbar .search-filter-actions .btn {
  min-height: 40px;
  height: 40px;
  padding: 8px 14px;
  border-radius: 6px !important;
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
}

.exercise-page-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.exercise-page-actions .exercise-toolbar-add,
.exercise-database-toolbar .exercise-toolbar-add,
.results-header-actions .exercise-toolbar-add {
  border-color: var(--wa-action-green, #0d5b55) !important;
  background: var(--wa-action-green, #0d5b55) !important;
  color: #ffffff !important;
  box-shadow: none !important;
  min-height: 40px;
  height: 40px;
  padding: 8px 14px;
  border-radius: 6px !important;
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
}

.exercise-page-actions .exercise-toolbar-add:hover,
.exercise-page-actions .exercise-toolbar-add:focus,
.exercise-database-toolbar .exercise-toolbar-add:hover,
.exercise-database-toolbar .exercise-toolbar-add:focus,
.results-header-actions .exercise-toolbar-add:hover,
.results-header-actions .exercise-toolbar-add:focus {
  border-color: var(--wa-action-green-hover, #0a4a45) !important;
  background: var(--wa-action-green-hover, #0a4a45) !important;
}

.exercise-database-toolbar .clear-filters-btn {
  border-color: rgba(145, 160, 200, 0.24) !important;
  background: #17213a !important;
  color: var(--ex-text, #f8fafc) !important;
  box-shadow: none !important;
}

.exercise-page-actions .exercise-toolbar-add,
.exercise-database-toolbar .exercise-toolbar-add,
.results-header-actions .exercise-toolbar-add,
.exercise-database-toolbar .clear-filters-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.exercise-database-toolbar .clear-filters-btn:hover,
.exercise-database-toolbar .clear-filters-btn:focus {
  border-color: color-mix(in srgb, var(--ex-accent, #3b82f6) 40%, var(--ex-border-strong) 60%) !important;
  background: #22325a !important;
  color: var(--ex-text, #f8fafc) !important;
}

.results-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(145, 160, 200, 0.24);
  padding-top: 8px;
  margin-top: 0;
  margin-bottom: 8px;
}

.results-header-actions {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.results-display-toggle {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(145, 160, 200, 0.32);
  border-radius: 4px;
  overflow: hidden;
  background: #17213a;
}

.results-display-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  height: 32px;
  padding: 4px 10px;
  border: 0;
  background: #17213a;
  color: var(--ex-text-secondary, #a4b0c0);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  position: relative;
}

.results-display-btn + .results-display-btn::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: rgba(145, 160, 200, 0.28);
}

.results-display-btn:hover,
.results-display-btn:focus-visible {
  background: #1f2d52;
  color: var(--ex-text, #f8fafc);
}

.results-display-btn--active {
  background: #2b4f9a;
  color: #ffffff;
}

.rows-per-page-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.rows-per-page-label {
  font-size: 0.82rem;
  color: var(--ex-text-secondary, #a4b0c0);
  line-height: 1;
  white-space: nowrap;
}

.rows-per-page-select {
  width: 76px;
  min-height: 32px;
  height: 32px;
  padding: 4px 24px 4px 8px;
  border-radius: 6px !important;
  font-size: 0.82rem;
  font-weight: 600;
}

.exercise-list--grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.exercise-list--grid .exercise-row {
  height: 100%;
}

.exercise-list--grid .pagination-row {
  grid-column: 1 / -1;
}

.exercise-list--grid .results-bottom-actions {
  grid-column: 1 / -1;
}

.results-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ex-text, #f8fafc);
}
.results-count {
  font-size: 0.84rem;
  color: var(--ex-text-secondary, #a4b0c0);
  line-height: 1.2;
}

.tab-content {
  background: transparent;
  border: 0;
  border-radius: 0 0 14px 14px;
  margin-top: 0;
  padding: 0;
  line-height: 1.6;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}
.tab-content > div { margin-top: 0; }
.tab-content .container.container-block { margin-top: 0 !important; }
.tab-content .panel {
  margin-top: 0;
  border-top: 0;
  border-radius: 8px;
  background: #1b2444;
  border-color: rgba(145, 160, 200, 0.24);
}
.exercise-results-panel { padding-top: 0; }

.panel {
  border: 1px solid rgba(145, 160, 200, 0.24);
  border-radius: 10px;
  padding: 15px;
  background: #1b2444;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  width: 100%;
  box-sizing: border-box;
}

/* Workout log styles */
.list-group-item.d-flex.align-items-center > .flex-grow-1 > div.row > .col {
  padding: 2px 6px !important;
  margin: 0 !important;
}
.list-group-item.d-flex.align-items-start > div[style*="flex-basis: 70%"],
.list-group-item.d-flex.align-items-start > div[style*="max-width: 70%"] {
  padding-left: 37px !important;
}
.list-group-item.d-flex.align-items-start {
  margin-bottom: 32px !important;
  margin-top: 16px !important;
  padding-top: 18px !important;
  padding-bottom: 18px !important;
}
.panel-body { margin-bottom: 0; }
.list-group-item.d-flex.align-items-center {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  margin-bottom: 2px !important;
}
.log-action-btn {
  width: 33px;
  height: 33px;
  min-width: 33px;
  min-height: 33px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  padding: 0;
}
.log-action-icon {
  font-size: 1.32em !important;
  vertical-align: middle;
  line-height: 1;
}

/* -- 0.84.39 Exercise Database dark-theme normalization (scoped) ---------- */
.exercises-page {
  --ex-surface-1: var(--wa-shell-surface, #1b2444);
  --ex-surface-2: var(--wa-shell-surface-elevated, #17213a);
  --ex-surface-3: var(--wa-shell-surface-soft, #22325a);
  --ex-border: var(--wa-shell-border, rgba(120, 145, 175, 0.16));
  --ex-border-strong: var(--wa-shell-border-strong, rgba(120, 145, 175, 0.24));
  --ex-text: var(--wa-shell-text, #f8fafc);
  --ex-text-secondary: var(--wa-shell-text-secondary, #a4b0c0);
  --ex-text-muted: var(--wa-shell-text-muted, #738196);
  --ex-accent: var(--wa-shell-accent, #1d4f9f);
}

.exercises-page .builder-hero.ff-page-header.app-header-gradient {
  background: linear-gradient(135deg, #0f2561 0%, #112463 42%, #1b2444 100%) !important;
  border: 1px solid var(--ex-border);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

/* .panel already supplies background/border/radius/shadow to exercise-results-panel,
   favorites-panel, edit-exercise-panel and custom-exercise-form-panel (all carry the
   .panel class). .search-filter-card and .exercise-database-toolbar set their own
   background/border/radius directly below, so no page-wide !important override is
   needed here (that override was forcing 14px radius over the intended 8px, and
   forcing a muted grey background onto the active tab - both removed). */

.exercises-page .exercise-card,
.exercises-page .edit-exercise-panel,
.exercises-page .list-group-item {
  background: #1b2444;
  border-color: rgba(145, 160, 200, 0.24);
  color: var(--ex-text);
}

.exercises-page .exercise-row:hover,
.exercises-page .exercise-row--active,
.exercises-page .search-filter-field .form-control,
.exercises-page .search-filter-field .form-select,
.exercises-page .edit-exercise-panel .form-control,
.exercises-page .edit-exercise-panel .form-select,
.exercises-page .filter-accordion-toggle,
.exercises-page .btn-fav,
.exercises-page .btn-edit-exercise {
  background: #17213a;
  border-color: var(--ex-border-strong);
}

.exercises-page .panel-header h4,
.exercises-page .exercise-title,
.exercises-page .results-title,
.exercises-page .pagination-info,
.exercises-page .logged-exercise-title,
.exercises-page .workout-log-summary {
  color: var(--ex-text);
}

.exercises-page .exercise-meta p,
.exercises-page .exercise-meta-inline,
.exercises-page .results-count,
.exercises-page .search-filter-field .form-label,
.exercises-page .edit-exercise-panel .form-label,
.exercises-page .header-meta,
.exercises-page .pagination-info,
.exercises-page .filter-accordion-toggle i,
.exercises-page .tab-label-full,
.exercises-page .tab-label-short,
.exercises-page .ex-tab {
  color: var(--ex-text-secondary);
}

.exercises-page .meta-dot {
  color: var(--ex-text-muted);
}

.exercises-page .ex-tab:hover {
  color: var(--ex-text);
  background: var(--ex-surface-3);
}

.exercises-page .search-filter-field .form-control,
.exercises-page .search-filter-field .form-select,
.exercises-page .edit-exercise-panel .form-control,
.exercises-page .edit-exercise-panel .form-select,
.exercises-page textarea,
.exercises-page input[type="number"] {
  color: var(--ex-text);
}

.exercises-page .search-filter-field .form-control::placeholder,
.exercises-page textarea::placeholder {
  color: var(--ex-text-muted);
}

.exercises-page .exercise-database-toolbar .search-filter-field .form-label {
  color: var(--ex-text, #f8fafc);
}

.exercises-page .exercise-database-toolbar .search-filter-field .form-control::placeholder {
  color: var(--ex-text-secondary, #a4b0c0);
}

.exercises-page .search-filter-field .form-control:focus,
.exercises-page .search-filter-field .form-select:focus,
.exercises-page .edit-exercise-panel .form-control:focus,
.exercises-page .edit-exercise-panel .form-select:focus {
  border-color: color-mix(in srgb, var(--ex-accent) 60%, var(--ex-border) 40%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ex-accent) 24%, transparent 76%);
}

.exercises-page .btn-fav {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.exercises-page .btn-fav:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #ffffff;
}

.exercises-page .btn-fav--active {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.exercises-page .btn-edit-exercise {
  background: var(--wa-action-blue, #2f6bff);
  border-color: var(--wa-action-blue, #2f6bff);
  color: #ffffff;
}

.exercises-page .btn-edit-exercise:hover,
.exercises-page .btn-edit-exercise:focus-visible {
  background: var(--wa-action-blue-hover, #2459d8);
  border-color: var(--wa-action-blue-hover, #2459d8);
  color: #ffffff;
}

.exercises-page .list-group-item,
.exercises-page .results-header-row,
.exercises-page .search-filter-card,
.exercises-page .tab-content,
.exercises-page .tab-content .panel,
.exercises-page .edit-exercise-panel .panel-header {
  border-color: rgba(145, 160, 200, 0.24);
}

.exercises-page .summary-img,
.exercises-page .exercise-img img,
.exercises-page .exercise-card .exercise-image img {
  border: 1px solid var(--ex-border-strong);
}

.exercises-page .btn-outline-secondary,
.exercises-page .btn-outline-dark,
.exercises-page .btn-secondary {
  color: var(--ex-text-secondary);
  border-color: var(--ex-border-strong);
  background: var(--ex-surface-2);
}

.exercises-page .btn-outline-secondary:hover,
.exercises-page .btn-outline-dark:hover,
.exercises-page .btn-secondary:hover {
  color: var(--ex-text);
  background: var(--ex-surface-3);
  border-color: var(--ex-border-strong);
}

.exercises-page .pagination-info,
.exercises-page .form-check-label,
.exercises-page .sel-ex-input,
.exercises-page .panel-body {
  color: var(--ex-text-secondary);
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RESPONSIVE â€“ 991px
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
@media (max-width: 991px) {
  .results-header-actions {
    align-items: center;
    justify-content: flex-end;
  }

  .results-display-toggle {
    margin-left: auto;
  }

  .rows-per-page-control {
    width: 100%;
    justify-content: flex-end;
  }

  .exercise-list--grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .search-filter-grid {
    grid-template-columns: 1fr;
  }
  .search-filter-actions {
    width: 100%;
  }
  .search-filter-actions .btn {
    flex: 1 1 calc(50% - 6px);
    min-height: 38px;
  }
  /* Dual-column card layout */
  .exercise-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 14px 16px;
    gap: 16px;
    min-height: 150px;
  }
  .exercise-img {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
  }
  .exercise-img img {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 12px;
    display: block;
  }
  .exercise-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .exercise-info .exercise-title {
    margin-bottom: 8px;
  }
  .exercise-info .exercise-meta {
    gap: 6px;
    margin-bottom: 8px;
  }
  .exercise-info .exercise-actions {
    margin-top: auto;
  }
  .exercise-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    padding: 16px;
    min-height: 150px;
  }
  .exercise-card .exercise-image {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
    margin: 0;
  }
  .exercise-card .exercise-image img {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 12px;
    display: block;
  }
  .exercise-card .exercise-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .exercise-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: auto;
  }
  .exercise-actions .btn {
    width: 100%;
    min-height: 44px;
    font-size: 0.82rem;
  }
}

/* ─────────────────────────────────────────────────────
   RESPONSIVE - 768px (Tablet / large phone)
───────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .exercise-database-toolbar .search-filter-primary-row {
    grid-template-columns: minmax(0, 1fr);
  }

  /* - Hero banner - */
  :deep(.builder-hero),
  .builder-hero {
    padding: 16px !important;
    min-height: auto !important;
    border-radius: 16px !important;
    margin-bottom: 12px !important;
  }
  :deep(.builder-hero) h2,
  :deep(.builder-hero__content) h2 {
    font-size: 1.4rem !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    margin: 0 !important;
  }

  /* - Overflow guard - */
  .exercises-page,
  .exercises-canvas,
  .ex-page-body,
  .tab-content,
  .panel,
  .container,
  .container-block {
    overflow-x: hidden !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  img {
    max-width: 100%;
    height: auto;
  }

  /* Tab bar layout/colors on mobile are owned by the ".exercises-page .ex-tab-bar"
     / ".exercises-page .ex-tab" rules in the mobile hierarchy block further down. */
  .tab-label-full  { display: none; }
  .tab-label-short { display: inline; }

  /* - Accordion toggle mobile style - */
  .filter-accordion-toggle {
    align-items: center;
    justify-content: center;
    width: auto;
    background: #17213a;
    border: 1px solid rgba(145, 160, 200, 0.24);
    padding: 7px 12px;
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--ex-text-secondary, #a4b0c0);
    cursor: pointer;
    border-radius: 4px !important;
  }
  .filter-toggle-main-icon { color: #60a5fa; }
  .filter-accordion-toggle i { font-size: 0.78rem; color: var(--ex-text-muted, #738196); }

  /* - Filter grid: 1-col on mobile - */
  .search-filter-grid {
    grid-template-columns: 1fr;
    gap: 8px 0;
  }

  /* - Action buttons: stacked, full-width - */
  .search-filter-actions {
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }
  .search-filter-actions .btn {
    width: 100% !important;
    min-height: 38px !important;
    font-size: 0.88rem;
  }

  .search-filter-body {
    padding: 8px 10px;
  }

  .exercise-database-toolbar .search-filter-field .form-control,
  .exercise-database-toolbar .search-filter-field .form-select,
  .search-filter-actions .btn {
    min-height: 40px !important;
    height: 40px !important;
    border-radius: 6px !important;
  }

  .exercise-database-toolbar .search-filter-field--search .form-control {
    padding-left: 54px !important;
  }

  .exercise-database-toolbar .search-filter-select-wrap .form-select {
    padding-right: 34px !important;
  }

  .exercise-database-toolbar .search-filter-input-icon,
  .exercise-database-toolbar .search-filter-select-icon {
    font-size: 0.74rem;
  }

  /* Results header colors/spacing on mobile are owned by the
     ".exercises-page .results-header-row" rule in the mobile hierarchy block further down. */

  /* - Exercise list gap - */
  .exercise-list {
    gap: 10px;
  }

  .exercise-list--grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* - Compact exercise card - */
  .exercise-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    padding: 10px;
    gap: 10px;
    min-height: auto;
  }
  .exercise-img {
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    margin: 0;
  }
  .exercise-img img {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 10px;
    display: block;
  }
  .exercise-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    height: auto;
  }
  .exercise-info .exercise-title {
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 0;
    line-height: 1.15;
  }
  .exercise-info .exercise-meta {
    gap: 2px;
    margin-bottom: 4px;
  }
  .exercise-meta p {
    font-size: 0.82rem;
    line-height: 1.15;
  }
  .exercise-info .exercise-actions {
    margin-top: 4px;
  }
  .exercise-card {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    min-height: auto;
  }
  .exercise-card .exercise-image {
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    margin: 0;
  }
  .exercise-card .exercise-image img {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 10px;
    display: block;
  }
  .exercise-card .exercise-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* - Compact action buttons (horizontal) - */
  .exercise-actions {
    display: flex;
    flex-direction: row;
    gap: 8px;
    margin-top: 0;
  }
  .exercise-actions .btn {
    height: 34px;
    min-height: 34px;
    font-size: 0.8rem;
    padding: 4px 10px;
    width: auto;
  }
}

/* ─────────────────────────────────────────────────────
   RESPONSIVE - 480px (Small phones)
───────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .ex-tab {
    min-width: 80px;
    max-width: 100px;
    height: 36px;
    padding: 0 8px;
    font-size: 0.78rem;
  }
  .ex-tab i { display: none; }
  .exercise-img { width: 64px; height: 64px; }
  .exercise-img img { width: 64px; height: 64px; border-radius: 8px; }
  .exercise-card .exercise-image { width: 64px; height: 64px; }
  .exercise-card .exercise-image img { width: 64px; height: 64px; border-radius: 8px; }
  .exercise-row { padding: 10px; gap: 8px; }
  .exercise-actions .btn { height: 32px; min-height: 32px; font-size: 0.75rem; padding: 3px 8px; }
}

/* Workout Builder-inspired hierarchy for the Exercise Database mobile view. */
@media (max-width: 768px) {
  .exercises-page .ex-page-body {
    padding: 8px !important;
    border: 1px solid rgba(145, 160, 200, 0.24) !important;
    border-radius: 10px !important;
    box-shadow: 0 10px 26px rgba(2, 6, 23, 0.32) !important;
  }

  .exercises-page .ex-tab-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
    padding: 4px !important;
    overflow: hidden;
    background: #1b2444;
    border: 1px solid rgba(145, 160, 200, 0.24);
    border-radius: 10px 10px 0 0 !important;
  }

  .exercises-page .ex-tab {
    width: 100%;
    min-width: 0;
    max-width: none;
    height: 38px !important;
    min-height: 38px !important;
    padding: 0 5px !important;
    gap: 4px;
    border-radius: 3px !important;
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1;
    opacity: 1;
    box-shadow: none;
  }

  .exercises-page .ex-tab--active {
    background: #1d4f9f !important;
    color: #ffffff !important;
    filter: none;
    transform: none;
    box-shadow: inset 0 -2px 0 0 rgba(200, 221, 255, 0.95), 0 0 0 1px rgba(196, 220, 255, 0.28);
  }

  .exercises-page .ex-tab i {
    display: inline-block;
    margin-right: 2px !important;
    color: #ffffff !important;
    font-size: 0.7rem;
  }

  .exercises-page .tab-content {
    border-color: rgba(145, 160, 200, 0.24) !important;
    border-radius: 0 0 10px 10px !important;
  }

  .exercises-page .tab-content .container.container-block {
    padding: 6px !important;
  }

  .exercises-page .tab-content .panel {
    border: 1px solid rgba(145, 160, 200, 0.24) !important;
    border-radius: 8px !important;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12) !important;
  }

  .exercises-page .tab-content .panel-header {
    gap: 8px;
    min-height: 38px;
    padding: 8px 10px;
    background: #1b2444 !important;
    background-image: none !important;
    border: 1px solid rgba(145, 160, 200, 0.24);
    border-left: 3px solid #1d4f9f;
    border-radius: 10px 10px 4px 4px;
  }

  .exercises-page .tab-content .panel-header.d-flex.justify-content-between {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center !important;
    flex-wrap: nowrap !important;
  }

  .exercises-page .tab-content .panel-header.d-flex.justify-content-between h4 {
    min-width: 0;
    font-size: 0.82rem;
  }

  .exercises-page .tab-content .panel-header h4 {
    color: #ffffff !important;
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.2;
  }

  .exercises-page .tab-content .panel-header .btn {
    min-height: 34px !important;
    padding: 5px 6px !important;
    border-radius: 6px !important;
    font-size: 0.68rem;
    white-space: nowrap;
  }

  .exercises-page .results-header-row {
    min-height: 38px;
    margin-bottom: 8px;
    padding: 8px 10px;
    background: #173a70;
    border: 1px solid rgba(96, 165, 250, 0.34);
    border-left: 3px solid #60a5fa;
    border-radius: 7px;
  }

  .exercises-page .results-title {
    color: #ffffff !important;
    font-size: 0.88rem;
    font-weight: 800;
  }

  .exercises-page .results-count {
    color: #c8ddff !important;
    font-size: 0.76rem;
  }

  .exercises-page .panel-body {
    padding: 10px !important;
  }

  .exercises-page .panel-body .py-4 {
    padding-top: 12px !important;
    padding-bottom: 12px !important;
  }

  .exercises-page .exercise-row,
  .exercises-page .exercise-card,
  .exercises-page .list-group-item {
    border-radius: 8px !important;
    border-color: rgba(145, 160, 200, 0.24) !important;
  }

  .exercises-page .tab-content .favorites-panel {
    overflow: hidden;
    background: #1b2444 !important;
    background-image: none !important;
    border-color: rgba(145, 160, 200, 0.24) !important;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12) !important;
  }

  .exercises-page .favorites-panel > .panel-body {
    background: #1b2444 !important;
  }

  .exercises-page .favorites-grid {
    --bs-gutter-x: 0;
    --bs-gutter-y: 0;
    margin: 0;
  }

  .exercises-page .favorite-exercise-item {
    width: 100%;
    margin-bottom: 8px !important;
    padding: 0;
  }

  .exercises-page .favorite-exercise-item:last-child {
    margin-bottom: 0 !important;
  }

  .exercises-page .favorite-exercise-card {
    position: relative;
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
    min-height: 78px;
    padding: 9px !important;
    overflow: hidden;
    background: #1b2444 !important;
    background-image: none !important;
    border: 1px solid rgba(145, 160, 200, 0.24) !important;
    border-radius: 7px !important;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12) !important;
  }

  .exercises-page .favorite-exercise-card .exercise-image,
  .exercises-page .favorite-exercise-card .exercise-image img {
    width: 60px;
    height: 60px;
    margin: 0;
    border-radius: 6px;
  }

  .exercises-page .favorite-exercise-card .exercise-image img {
    object-fit: cover;
    border: 1px solid rgba(145, 160, 200, 0.24);
  }

  .exercises-page .favorite-exercise-content {
    align-self: stretch;
    justify-content: center;
    gap: 5px;
    min-width: 0;
    padding-right: 54px;
  }

  .exercises-page .favorite-exercise-content .exercise-title {
    margin: 0;
    color: #f8fafc;
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .exercises-page .favorite-exercise-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 0;
  }

  .exercises-page .favorite-exercise-badge {
    display: inline-flex;
    align-items: center;
    width: auto;
    max-width: 100%;
    min-height: 18px;
    padding: 3px 6px;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.62rem;
    font-weight: 700;
    line-height: 1;
    white-space: normal;
  }

  .exercises-page .favorite-exercise-badge--type {
    color: #c8ddff;
    background: rgba(37, 99, 235, 0.2) !important;
    border-color: rgba(96, 165, 250, 0.32);
  }

  .exercises-page .favorite-exercise-badge--muscle {
    color: #bff7ed;
    background: rgba(13, 148, 136, 0.2) !important;
    border-color: rgba(45, 212, 191, 0.3);
  }

  .exercises-page .favorite-exercise-badge--equipment {
    color: #d8dee9;
    background: rgba(100, 116, 139, 0.24) !important;
    border-color: rgba(148, 163, 184, 0.26);
  }

  .exercises-page .favorite-exercise-action {
    position: absolute;
    top: 8px;
    right: 8px;
    margin: 0;
  }

  .exercises-page .favorite-exercise-toggle {
    width: auto !important;
    min-width: 56px;
    height: 32px !important;
    min-height: 32px !important;
    padding: 4px 7px !important;
    border-radius: 6px !important;
    color: #e2e8f0 !important;
    background: #17213a !important;
    border-color: rgba(148, 163, 184, 0.32) !important;
    font-size: 0.7rem;
    white-space: nowrap;
  }

  .exercises-page .favorite-exercise-toggle .fa-heart {
    color: #ef476f !important;
  }
}
</style>

