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
              <td data-label="Date"><span class="cell-value">{{ log.date }}</span></td>
              <td data-label="Meal"><span class="cell-value">{{ log.meal }}</span></td>
              <td data-label="Details"><span class="cell-value cell-value--details">{{ log.details }}</span></td>
              <td data-label="Calories"><span class="cell-value">{{ log.calories }}</span></td>
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

.nutrition-log-panel .btn-box .btn.btn-sm.btn-primary.btn-add-meal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(147, 197, 253, 0.42) !important;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
  color: #ffffff !important;
  text-decoration: none;
  box-shadow: none !important;
  white-space: nowrap;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 700;
}

.nutrition-log-panel .btn-box .btn.btn-sm.btn-primary.btn-add-meal:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
  filter: brightness(1.06);
  color: #ffffff !important;
  box-shadow: none !important;
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

.nutrition-log-table .cell-value {
  display: inline;
}

.nutrition-log-table td:nth-child(3) {
  line-height: 1.3;
}

@media (max-width: 600px) {
  /* --- panel header --- */
  .nutrition-log-panel .panel-header {
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
  }

  .nutrition-log-panel .panel-header h5 {
    font-size: 0.88rem;
  }

  .nutrition-log-panel .btn-add-meal {
    min-height: 34px;
    padding: 0 13px;
    font-size: 0.72rem;
  }

  /* --- table → stacked cards --- */
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
    box-sizing: border-box;
  }

  .nutrition-log-table thead {
    display: none;
  }

  .nutrition-log-table tbody {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* each row = a card */
  .nutrition-log-table tr {
    border: 1px solid var(--wa-shell-border, rgba(255, 255, 255, 0.12));
    border-radius: 10px;
    padding: 12px 14px;
    background: var(--wa-shell-surface-elevated, #17212d);
    color: var(--wa-shell-text, #f8fafc);
  }

  /* each cell = one label: value line */
  .nutrition-log-table td {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 6px;
    padding: 2px 0;
    font-size: 0.82rem;
    line-height: 1.4;
    color: var(--wa-shell-text, #f8fafc);
    border: none;
    min-width: 0;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  /* "DATE:" label prefix */
  .nutrition-log-table td::before {
    content: attr(data-label) ":";
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--wa-shell-text-muted, #94a3b8);
    flex-shrink: 0;
  }

  /* value text — inherits wrapping from flex container */
  .nutrition-log-table .cell-value {
    display: inline;
    text-align: left;
    min-width: 0;
    max-width: 100%;
    color: inherit;
    overflow-wrap: anywhere;
  }

  .nutrition-log-table .cell-value--details {
    display: inline-block;
    flex: 1 1 0;
    min-width: 0;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    line-height: 1.4;
  }

  /* hover / tap states — stay dark navy, never black */
  .nutrition-log-table tbody tr:hover,
  .nutrition-log-table tbody tr:focus-within,
  .nutrition-log-table tbody tr:active {
    background: #1e293b !important;
    border-color: rgba(96, 165, 250, 0.35) !important;
    color: #f8fafc !important;
  }

  .nutrition-log-table tbody tr:hover td,
  .nutrition-log-table tbody tr:focus-within td,
  .nutrition-log-table tbody tr:active td {
    color: #f8fafc !important;
  }

  .nutrition-log-table tbody tr:hover td::before,
  .nutrition-log-table tbody tr:focus-within td::before,
  .nutrition-log-table tbody tr:active td::before {
    color: #cbd5e1 !important;
  }

  .nutrition-log-table tr,
  .nutrition-log-table td,
  .nutrition-log-table .cell-value {
    -webkit-tap-highlight-color: rgba(96, 165, 250, 0.2);
  }

  /* text selection */
  .nutrition-log-panel .nutrition-log-table ::selection {
    background: rgba(59, 130, 246, 0.3);
    color: #f8fafc;
  }
}
</style>
