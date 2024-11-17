// Import Libraries
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';

// Create App
import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Import the router

// Create and mount the app
const app = createApp(App);

app.use(router); // Use the router
app.mount('#app');


