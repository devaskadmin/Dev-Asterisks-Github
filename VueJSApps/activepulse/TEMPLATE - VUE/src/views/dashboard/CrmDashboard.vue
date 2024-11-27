<script setup>
import { onMounted } from "vue";
import CrmStatsComponent from "@/components/crm-dashboard/CrmStatsComponent.vue";
import BalanceOverviewChartComponent from "@/components/crm-dashboard/BalanceOverviewChartComponent.vue";
import RecentProjectsComponent from "@/components/crm-dashboard/RecentProjectsComponent.vue";
import UpcomingActivitiesComponent from "@/components/crm-dashboard/UpcomingActivitiesComponent.vue";
import PendingWorksComponent from "@/components/crm-dashboard/PendingWorksComponent.vue";
import InvoicesComponent from "@/components/crm-dashboard/InvoicesComponent.vue";
import MyTasksComponent from "@/components/crm-dashboard/MyTasksComponent.vue";
import CrmNoticeBoardComponent from "@/components/crm-dashboard/CrmNoticeBoardComponent.vue";
import WorksDeadlinesComponent from "@/components/crm-dashboard/WorksDeadlinesComponent.vue";
import DateRangePicker from "@/components/DateRangePicker.vue";

onMounted(() => {});
</script>

<template>
  <!-- Breadcrumb -->
  <div class="dashboard-breadcrumb mb-25">
    <h2>{{ $t("dashboard.crm_dashboard") }}</h2>
    <DateRangePicker />
  </div>

  <!-- Top Stats Tiles -->
  <CrmStatsComponent />

  <!-- Bar Chart and Assigned Workouts -->
  <div class="row g-4 mt-4">
  <div class="col-lg-8">
    <BalanceOverviewChartComponent />
  </div>
  <div class="col-lg-4">
    <RecentProjectsComponent />
  </div>
</div>


  <!-- Upcoming Activities and Pending Works -->
  <div class="row mt-4">
    <div class="col-lg-6">
      <UpcomingActivitiesComponent />
    </div>
    <div class="col-lg-6">
      <PendingWorksComponent />
    </div>
  </div>

  <!-- Invoices and My Tasks -->
  <div class="row mt-4">
    <div class="col-lg-8">
      <InvoicesComponent />
    </div>
    <div class="col-lg-4">
      <MyTasksComponent />
    </div>
  </div>

  <!-- Notice Board and Work Deadlines -->
  <div class="row mt-4">
    <div class="col-lg-6">
      <CrmNoticeBoardComponent />
    </div>
    <div class="col-lg-6">
      <WorksDeadlinesComponent />
    </div>
  </div>
</template>

<style scoped>
.row {
  margin-bottom: 20px; /* Consistent spacing between rows */
}

.dashboard-breadcrumb {
  margin-bottom: 20px;
}
</style>
