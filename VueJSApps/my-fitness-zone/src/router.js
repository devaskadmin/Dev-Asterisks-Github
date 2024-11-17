import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "@/components/LoginPage.vue";
import ProtectedPage from "@/components/ProtectedPage.vue";
import UserDashboard from "@/views/UserDashboard.vue"; // Updated import

const routes = [
  { path: "/", component: LoginPage },
  { path: "/protected", component: ProtectedPage },
  { path: "/dashboard", component: UserDashboard }, // Updated route
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
