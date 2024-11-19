<script setup>
import {onMounted, ref} from "vue";
import SocialMediaVisitorComponent from "@/components/ecommerce-dashboard/SocialMediaVisitorComponent.vue";
import NewCustomersComponent from "@/components/ecommerce-dashboard/NewCustomersComponent.vue";
import RecentOrdersComponent from "@/components/ecommerce-dashboard/RecentOrdersComponent.vue";
import DateRangePicker from "@/components/DateRangePicker.vue";


const isLoggedIn = ref(false);


// Methods
const login = () => {
  isLoggedIn.value = true;
  console.log("LOGIN")
};

const logout = () => {
  isLoggedIn.value = false;
  console.log("Logout")
};



const redirectToLogin = () => {
  router.push('/view-profile');
};


onMounted(() => {

})


</script>

<template>
  <div class="dashboard-breadcrumb mb-25">
    <h2>{{ $t('dashboard.ecommerce_dashboard') }}</h2>
    <DateRangePicker />
  </div>
  <EcommarceStatsComponent />

  <div class="row">
  
  welcome
    
  
  <div v-if="isLoggedIn">
      <p>Welcome back, User!</p>
      <button @click="logout">Logout</button>
    </div>
    <div v-else>
      <p>Please log in to access your account.</p>
      <button @click="login">Login</button>
     
    </div>
    </div>
    <router-link :to="{ name: 'edit_profile'}" class="dropdown-item"><i class="fa-regular fa-pen-to-square"></i> Edit Information</router-link>
</template>

<style scoped>
</style>