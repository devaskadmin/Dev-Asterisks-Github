<template>
    <div class="protected-page">
      <h1>Welcome to the Protected Page</h1>
      <p>Your access to this page confirms your login.</p>
      <button @click="logout">Logout</button>
    </div>
  </template>
  
  <script>
  export default {
    name: "ProtectedPage",
    methods: {
      logout() {
        localStorage.removeItem("token");
        this.$router.push("/login");
      },
    },
  };
  </script>
  
  <style>
  .protected-page {
    text-align: center;
    margin-top: 50px;
  }
  
  .protected-page h1 {
    font-size: 2rem;
    color: #2c3e50;
  }
  </style>
  