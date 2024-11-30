<template>
    <div class="todays-plan card shadow p-3 mb-4">
      <h5 class="card-title">Today’s Plan</h5>
      <div class="mb-3">
        <h6>Workout:</h6>
        <p>4 sets of squats, 3 sets of lunges</p>
        <button class="btn btn-primary">Start Workout</button>
      </div>
      <div>
        <h6>Nutrition:</h6>
        <p>Calories: <strong>1200 / 2000</strong></p>
        <button class="btn btn-secondary">Log Nutrition</button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "TodaysPlan",
  };
  </script>
  
  <style scoped>
  .card-title {
    font-size: 1.2rem;
    font-weight: bold;
  }
  .todays-plan {
    border-radius: 10px;
  }
  </style>
  