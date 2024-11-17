<template>
    <div class="quick-access card shadow p-3">
      <h5 class="card-title">Quick Access</h5>
      <button class="btn btn-info w-100 mb-2">Log Workout</button>
      <button class="btn btn-info w-100 mb-2">View Achievements</button>
      <button class="btn btn-info w-100">Book a Session</button>
    </div>
  </template>
  
  <script>
  export default {
    name: "QuickAccess",
  };
  </script>
  
  <style scoped>
  .card-title {
    font-size: 1.2rem;
    font-weight: bold;
  }
  .quick-access {
    border-radius: 10px;
  }
  </style>
  