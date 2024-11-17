<template>
    <div class="recent-achievements card shadow p-4">
      <h6 class="mb-3">Recent Achievements</h6>
      <ul class="achievement-list">
        <li v-for="achievement in achievements" :key="achievement" class="mb-2">
          <i class="bi bi-trophy-fill text-warning"></i> {{ achievement }}
        </li>
      </ul>
    </div>
  </template>
  
  <script>
  export default {
    name: "RecentAchievements",
    data() {
      return {
        achievements: [
          "Hit a new squat PR: 200 lbs",
          "Completed 5 workouts this week",
          "Lost 2 pounds last month",
        ],
      };
    },
  };
  </script>
  
  <style scoped>
  .recent-achievements {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }
  .achievement-list {
    list-style: none;
    padding: 0;
  }
  .achievement-list li {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
  }
  .bi-trophy-fill {
    margin-right: 10px;
  }
  </style>
  