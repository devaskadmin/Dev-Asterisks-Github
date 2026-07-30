<script setup>
const NutritionLogs = [
  { date: "Nov 23", meal: "Breakfast", details: "Oatmeal, Banana, Coffee", calories: "320 kcal" },
  { date: "Nov 23", meal: "Lunch", details: "Grilled Chicken Salad, Water", calories: "450 kcal" },
  { date: "Nov 23", meal: "Snack", details: "Protein Bar, Green Tea", calories: "200 kcal" },
  { date: "Nov 23", meal: "Dinner", details: "Salmon, Quinoa, Steamed Vegetables", calories: "500 kcal" },
];
</script>

<template>
  <div class="panel nutrition-log-panel">
    <div class="panel-header">
      <h5>Nutrition Log</h5>
      <div class="btn-box">
        <a href="#" class="btn btn-sm btn-primary btn-add-meal">Add Meal</a>
      </div>
    </div>
    <div class="panel-body">
      <div class="table-responsive">
        <table class="table table-hover table-Nutrition nutrition-log-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Meal</th>
              <th>Details</th>
              <th>Calories</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, index) in NutritionLogs" :key="index">
              <td data-label="Date">{{ log.date }}</td>
              <td data-label="Meal">{{ log.meal }}</td>
              <td data-label="Details">{{ log.details }}</td>
              <td data-label="Calories">{{ log.calories }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nutrition-log-panel {
  min-width: 0;
}

.nutrition-log-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--wa-shell-border, rgba(255, 255, 255, 0.1));
}

.nutrition-log-panel .panel-header h5 {
  margin: 0;
  color: var(--wa-shell-text, #f8fafc);
  font-size: 0.9rem;
}

.nutrition-log-panel .btn-box {
  position: static !important;
  margin-left: auto;
  flex-shrink: 0;
}

.nutrition-log-panel .btn-add-meal {
  white-space: nowrap;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.nutrition-log-panel .panel-body {
  padding-top: 10px;
}

.nutrition-log-panel .table-responsive {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0 !important;
  padding: 0 !important;
  display: block;
  overflow-x: hidden;
}

.nutrition-log-table {
  width: 100% !important;
  max-width: 100% !important;
  margin-bottom: 0;
  table-layout: fixed;
}

.nutrition-log-table th,
.nutrition-log-table td {
  font-size: 0.8rem;
  vertical-align: middle;
}

.nutrition-log-table th {
  color: var(--wa-shell-text-muted, #95a3b8);
  font-weight: 700;
}

.nutrition-log-table td {
  color: var(--wa-shell-text, #f8fafc);
  white-space: normal;
  overflow-wrap: anywhere;
}

.nutrition-log-table td:nth-child(3) {
  line-height: 1.3;
}

@media (max-width: 600px) {
  .nutrition-log-panel .panel-header {
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
  }

  .nutrition-log-panel .panel-header h5 {
    font-size: 0.88rem;
  }

  .nutrition-log-panel .btn-add-meal {
    min-height: 32px;
    padding: 4px 11px;
    font-size: 0.72rem;
  }

  .nutrition-log-panel .table-responsive {
    overflow-x: hidden;
  }

  .nutrition-log-table,
  .nutrition-log-table thead,
  .nutrition-log-table tbody,
  .nutrition-log-table tr,
  .nutrition-log-table td {
    display: block;
    width: 100%;
  }

  .nutrition-log-table thead {
    display: none;
  }

  .nutrition-log-table tbody {
    display: grid;
    gap: 8px;
  }

  .nutrition-log-table tr {
    border: 1px solid var(--wa-shell-border, rgba(255, 255, 255, 0.12));
    border-radius: 10px;
    padding: 8px 10px;
    background: var(--wa-shell-surface-elevated, #17212d);
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .nutrition-log-table td {
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    gap: 8px;
    padding: 2px 0;
    font-size: 0.82rem;
    line-height: 1.3;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .nutrition-log-table td::before {
    content: attr(data-label);
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--wa-shell-text-muted, #95a3b8);
  }
}
</style>
