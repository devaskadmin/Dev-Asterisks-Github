<template>
    <div class="mini-calorie-widget card shadow p-3 text-center">
      <h6>Calories</h6>
      <div class="calorie-progress">
        <div
          class="calorie-bar"
          :style="{ width: `${caloriePercentage}%` }"
        ></div>
      </div>
      <p class="text-muted">
        {{ caloriesConsumed }} / {{ calorieGoal }} kcal
      </p>
    </div>
  </template>
  
  <script>
  export default {
    name: "MiniCalorieWidget",
    data() {
      return {
        caloriesConsumed: 1500,
        calorieGoal: 2000,
      };
    },
    computed: {
      caloriePercentage() {
        return Math.round((this.caloriesConsumed / this.calorieGoal) * 100);
      },
    },
  };
  </script>
  
  <style scoped>
  .mini-calorie-widget {
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }
  .calorie-progress {
    position: relative;
    height: 10px;
    width: 100%;
    background: #e0e0e0;
    border-radius: 5px;
    overflow: hidden;
    margin: 10px 0;
  }
  .calorie-bar {
    height: 100%;
    background: linear-gradient(90deg, #ff9800, #f44336);
    transition: width 0.3s ease-in-out;
  }
  </style>
  