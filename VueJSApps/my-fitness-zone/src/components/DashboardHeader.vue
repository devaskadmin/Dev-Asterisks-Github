<template>
    <div class="dashboard-header text-center text-white bg-primary p-4 rounded shadow">
      <h1>Welcome back, {{ userName }}!</h1>
      <p class="mb-0">Let’s make today count!</p>
    </div>
  </template>
  
  <script>
  export default {
    name: "DashboardHeader",
    data() {
      return {
        userName: "John Doe", // Replace with dynamic user data
      };
    },
  };
  </script>
  
  <style scoped>
  .dashboard-header {
    margin-bottom: 20px;
  }
  </style>
  