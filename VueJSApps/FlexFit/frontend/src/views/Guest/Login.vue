<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router"; // ✅ Import Vue Router

// Near top of file
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";


const router = useRouter(); // ✅ Initialize Vue Router

const username = ref("");
const password = ref("");
const isPasswordShow = ref(false);
const errorMsg = ref("");

// 🔹 Login Function
const login = async () => {
  try {
    errorMsg.value = ""; // Clear old error


    const response = await axios.post(`${API_BASE}/api/login`,
      {
        username: username.value,
        password: password.value
      },
      { withCredentials: true }
    );

    if (response.data.message === "Login successful") {
      router.push({ name: "dashboard_index" });
    } else {
      errorMsg.value = response.data.message || "Login failed. Try again.";
    }
  } catch (error) {
    errorMsg.value =
      error.response?.data?.message || "Error: incorrect username and/or password.";
  }
};

</script>

<template>
  <div class="container">
    <div class="d-flex justify-content-end">
      <div class="login-body">
        <div class="top d-flex justify-content-between align-items-center">
          <div class="logo">
            <img src="@/assets/images/flex-fitlogo-transparent.png" alt="Logo">
          </div>
          <router-link :to="{ name: 'dashboard_index' }"><i class="fa-duotone fa-house-chimney"></i></router-link>
        </div>
        <div class="bottom">
          <h3 class="panel-title">Login</h3>
          <form @submit.prevent="login">
            <div class="input-group mb-25">
              <span class="input-group-text"><i class="fa-regular fa-user"></i></span>
              <input v-model="username" type="text" class="form-control" placeholder="Username or email address">
            </div>
            <div class="input-group mb-20">
              <span class="input-group-text"><i class="fa-regular fa-lock"></i></span>
              <input v-model="password" :type="[isPasswordShow ? 'text' : 'password']" class="form-control rounded-end" placeholder="Password">
              <a role="button" class="password-show" @click="isPasswordShow = !isPasswordShow"><i class="fa-duotone" :class="[isPasswordShow ? 'fa-eye-slash':'fa-eye']"></i></a>
            </div>
            <div class="d-flex justify-content-between mb-25">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" value="" id="loginCheckbox">
                <label class="form-check-label text-white" for="loginCheckbox">
                  Remember Me
                </label>
              </div>
              <router-link :to="{ name: 'reset_password' }" class="text-white fs-14">Forgot Password?</router-link>

              
            </div>



            <div v-if="errorMsg" class="alert alert-danger text-center mb-3">
  {{ errorMsg }}
</div>


            <button class="btn btn-primary w-100 login-btn">Sign in</button>
          </form>
          
          
          
          <div class="other-option">
            <p>Or continue with</p>
            <div class="social-box d-flex justify-content-center gap-20">
              <a href="#"><i class="fa-brands fa-facebook-f"></i></a>
              <a href="#"><i class="fa-brands fa-twitter"></i></a>
              <a href="#"><i class="fa-brands fa-google"></i></a>
              <a href="#"><i class="fa-brands fa-instagram"></i></a>
            </div>
          </div>



          <!-- Registration link -->
<div class="other-option mt-3">
        <p class="mb-0 text-white">Don't have an account? 
          <router-link to="/register" class="text-white text-decoration-underline">Click here to sign up.</router-link>
        </p>
      </div>





        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.light-theme .main-content .login-body {
    background: rgba(255, 255, 255, 1);
    border: 1px solid black;
}


</style>