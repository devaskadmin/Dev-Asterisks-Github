<template>
  <div class="dashboard">
    <!-- Header Section -->
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">Welcome Back!</h1>
        <p class="dashboard-subtitle">Track your progress and stay motivated.</p>
      </div>
      <div class="action-buttons">
        <button class="btn btn-gradient">
          <i class="bi bi-graph-up-arrow"></i> Track Workout
        </button>
        <button class="btn btn-gradient">
          <i class="bi bi-bar-chart-line"></i> View Analytics
        </button>
        <button class="btn btn-outline">
          <i class="bi bi-gear"></i> Settings
        </button>
      </div>
    </header>

    <!-- Stats Cards Section -->
    <section class="stats-section">
      <StatsCards
        :workoutsThisWeek="workoutsThisWeek"
        :streak="streak"
        :pointsEarned="pointsEarned"
      />
    </section>

    <!-- Weekly Progress Circle -->
    <section class="progress-section">
      <ProgressOverview />
    </section>

    <!-- Analytical Visuals Section -->
    <section class="analytics-section">
      <ProgressChart />
    </section>

    <!-- Quick Access Section -->
    <section class="quick-access-section">
      <QuickAccess />
    </section>

    <!-- Footer Section -->
    <AppFooter />
  </div>
</template>

<script>
import StatsCards from "@/components/StatsCards.vue";
import ProgressOverview from "@/components/ProgressOverview.vue";
import ProgressChart from "@/components/ProgressChart.vue";
import QuickAccess from "@/components/QuickAccess.vue";
import AppFooter from "@/components/AppFooter.vue";

export default {
  components: {
    StatsCards,
    ProgressOverview,
    ProgressChart,
    QuickAccess,
    AppFooter,
  },
  data() {
    return {
      workoutsThisWeek: 7,
      streak: 5,
      pointsEarned: 250,
    };
  },
};
</script>

<style scoped>
/* Dashboard Container */
.dashboard {
  padding: 20px;
  background: linear-gradient(135deg, #e0f7fa, #80deea);
  min-height: 100vh;
  font-family: 'Roboto', sans-serif;
  color: #212121;
}

/* Header Section */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 20px;
  backdrop-filter: blur(15px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header-content {
  max-width: 60%;
}

.dashboard-title {
  font-size: 2rem;
  font-weight: bold;
}

.dashboard-subtitle {
  font-size: 1.2rem;
  margin-top: 5px;
  opacity: 0.8;
}

/* Buttons with Gradient */
.action-buttons {
  display: flex;
  gap: 10px;
}

.action-buttons .btn {
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
  gap: 5px;
}

.action-buttons .btn-gradient {
  background: linear-gradient(135deg, #4caf50, #00bcd4);
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-buttons .btn-gradient:hover {
  transform: translateY(-2px);
}

.action-buttons .btn-outline {
  background: transparent;
  border: 2px solid #ffffff;
  color: #ffffff;
}

.action-buttons .btn-outline:hover {
  background: #ffffff;
  color: #4caf50;
}

/* Stats Section */
.stats-section {
  margin: 20px 0;
}

/* Progress Section */
.progress-section {
  margin: 20px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Analytics Section */
.analytics-section {
  margin: 20px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Quick Access Section */
.quick-access-section {
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}
</style>
