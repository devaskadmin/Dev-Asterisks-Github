import { pagesRoutes } from "@/router/pages";
import { errorPageRoutes } from "@/router/errorPages";
import { guestRoutes } from "@/router/guest";

// Define appRoutes array
let appRoutes = [];

// Add routes from other modules
appRoutes.push(...pagesRoutes);
appRoutes.push(...errorPageRoutes);
appRoutes.push(...guestRoutes);

// Add CRM dashboard route explicitly
appRoutes.push({
  path: "/crm-dashboard",
  name: "CRMdashboard",
  component: () => import("@/views/CRMdashboard.vue"),
});

// Add your test route
appRoutes.push({
  path: "/test",
  component: () => import("@/components/TestComponent.vue"),
});

// Export routes
export default appRoutes;
