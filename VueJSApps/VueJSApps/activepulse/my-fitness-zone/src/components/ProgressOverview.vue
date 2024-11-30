<template>
    <div class="progress-overview card shadow p-4 text-center">
      <h5 class="card-title">Your Weekly Progress</h5>
      <div class="circle-container">
        <div class="circle">
          <div class="inner-circle">
            <span class="progress-label">{{ progress }}%</span>
          </div>
          <div
            class="progress-bar"
            :style="{ background: `conic-gradient(#4caf50 ${progress * 3.6}deg, #e0e0e0 0deg)` }"
          ></div>
        </div>
      </div>
      <p class="mt-3 text-muted">
        You’ve completed {{ completedWorkouts }} out of {{ totalWorkouts }} workouts this week!
      </p>
    </div>
  </template>
  
  <script>
  export default {
    name: "ProgressOverview",
    data() {
      return {
        completedWorkouts: 4,
        totalWorkouts: 5,
      };
    },
    computed: {
      progress() {
        return Math.round((this.completedWorkouts / this.totalWorkouts) * 100);
      },
    },
  };
  </script>
  
  <style scoped>
  .card-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
  .circle-container {
    position: relative;
    width: 180px;
    height: 180px;
    margin: 0 auto;
  }
  .circle {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    overflow: hidden;
    background: #e0e0e0;
  }
  .inner-circle {
    position: absolute;
    width: 70%;
    height: 70%;
    background: #ffffff;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .progress-label {
    font-size: 1.5rem;
    font-weight: bold;
    color: #4caf50;
  }
  .progress-bar {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    z-index: 1;
    transition: background 0.5s ease-in-out;
  }
  </style>
  