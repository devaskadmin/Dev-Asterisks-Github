<template>
    <div class="motivational-quote">
      <p>{{ quote }}</p>
    </div>
  </template>
  
  <script>
  export default {
    name: "MotivationalQuote",
    data() {
      return {
        quote: "The only bad workout is the one you didn’t do. 💪",
      };
    },
  };
  </script>
  
  <style scoped>
  .motivational-quote {
    margin: 20px 0;
    padding: 15px;
    background: linear-gradient(135deg, #ff9800, #f44336);
    color: #ffffff;
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  </style>
  