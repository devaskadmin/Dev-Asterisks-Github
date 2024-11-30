<template>
    <div class="stats-cards">
      <div v-for="stat in stats" :key="stat.id" class="card">
        <div class="card-icon">
          <i :class="stat.icon"></i>
        </div>
        <div class="card-info">
          <h3 class="card-title">{{ stat.value }}</h3>
          <p class="card-subtitle">{{ stat.label }}</p>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "StatsCards",
    props: {
      workoutsThisWeek: {
        type: Number,
        default: 0,
      },
      streak: {
        type: Number,
        default: 0,
      },
      pointsEarned: {
        type: Number,
        default: 0,
      },
    },
    computed: {
      stats() {
        return [
          {
            id: 1,
            value: this.workoutsThisWeek,
            label: "Workouts This Week",
            icon: "bi bi-dumbbell",
          },
          {
            id: 2,
            value: this.streak,
            label: "Streak: Consecutive Days",
            icon: "bi bi-calendar-check",
          },
          {
            id: 3,
            value: this.pointsEarned,
            label: "Points Earned",
            icon: "bi bi-stars",
          },
        ];
      },
    },
  };
  </script>
  
  <style scoped>
  .stats-cards {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 20px;
    margin: 20px 0;
  }
  
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-radius: 15px;
    background: linear-gradient(135deg, #4caf50, #00bcd4);
    color: #ffffff;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease-in-out;
    width: 150px;
    text-align: center;
  }
  
  .card:hover {
    transform: translateY(-10px);
  }
  
  .card-icon {
    font-size: 2rem;
    margin-bottom: 10px;
  }
  
  .card-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0;
  }
  
  .card-subtitle {
    font-size: 0.9rem;
    opacity: 0.8;
  }
  </style>
  