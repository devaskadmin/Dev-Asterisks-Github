<template>
  <div id="app">
    <div class="login-page">
      <transition name="fade">
        <div v-if="!registerActive" class="wallpaper-login"></div>
      </transition>
      <div class="wallpaper-register"></div>

      <div class="container">
        <div class="row">
          <div class="col-lg-4 col-md-6 col-sm-8 mx-auto">
            <!-- Login Form -->
            <div v-if="!registerActive" class="card login" v-bind:class="{ error: emptyFields }">
              <h1>Sign In</h1>
              <form class="form-group" @submit.prevent="doLogin">
                <input
                  v-model="emailLogin"
                  type="email"
                  class="form-control"
                  placeholder="Email"
                  required
                />
                <input
                  v-model="passwordLogin"
                  type="password"
                  class="form-control"
                  placeholder="Password"
                  required
                />
                <button type="submit" class="btn btn-primary">Sign In</button>
                <p>
                  Don't have an account?
                  <a href="#" @click="toggleRegister">Sign up here</a>
                </p>
                <p><a href="#">Forgot your password?</a></p>
              </form>
              <p v-if="loginError" class="text-danger">{{ loginError }}</p>
            </div>

            <!-- Register Form -->
            <div v-else class="card register" v-bind:class="{ error: emptyFields }">
              <h1>Sign Up</h1>
              <form class="form-group" @submit.prevent="doRegister">
                <input
                  v-model="emailReg"
                  type="email"
                  class="form-control"
                  placeholder="Email"
                  required
                />
                <input
                  v-model="passwordReg"
                  type="password"
                  class="form-control"
                  placeholder="Password"
                  required
                />
                <input
                  v-model="confirmReg"
                  type="password"
                  class="form-control"
                  placeholder="Confirm Password"
                  required
                />
                <button type="submit" class="btn btn-primary">Sign Up</button>
                <p>
                  Already have an account?
                  <a href="#" @click="toggleRegister">Sign in here</a>
                </p>
              </form>
              <p v-if="registerError" class="text-danger">{{ registerError }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../services/api";

export default {
  name: "LoginPage",
  data() {
    return {
      registerActive: false,
      emailLogin: "",
      passwordLogin: "",
      emailReg: "",
      passwordReg: "",
      confirmReg: "",
      loginError: "",
      registerError: "",
      emptyFields: false,
    };
  },
  methods: {
    async doLogin() {
      this.loginError = "";
      this.emptyFields = false;

      if (this.emailLogin === "" || this.passwordLogin === "") {
        this.emptyFields = true;
        console.log("Empty fields detected");
        return;
      }

      try {
        console.log("Attempting login with:", {
          email: this.emailLogin,
          password: this.passwordLogin,
        });

        const response = await apiClient.post("/login", {
          email: this.emailLogin,
          password: this.passwordLogin,
        });

        console.log("Login response:", response.data);

        const { token } = response.data;
        localStorage.setItem("token", token);
        alert("Login successful!");

        // Redirect to the dashboard
        this.$router.push("/dashboard");
      } catch (error) {
        console.error("Login error details:", error.response?.data || error.message);
        this.loginError = error.response?.data?.message || "Login failed!";
      }
    },
    async doRegister() {
      this.registerError = "";
      this.emptyFields = false;

      if (
        this.emailReg === "" ||
        this.passwordReg === "" ||
        this.confirmReg === ""
      ) {
        this.emptyFields = true;
        return;
      }

      if (this.passwordReg !== this.confirmReg) {
        this.registerError = "Passwords do not match!";
        return;
      }

      try {
        await apiClient.post("/register", {
          name: this.emailReg.split("@")[0], // Use a simple name derivation for demo
          email: this.emailReg,
          password: this.passwordReg,
        });
        alert("Registration successful!");
        this.registerActive = false; // Switch to login
      } catch (error) {
        this.registerError = error.response?.data?.message || "Registration failed!";
      }
    },
    toggleRegister() {
      this.registerActive = !this.registerActive;
      this.emptyFields = false;
      this.loginError = "";
      this.registerError = "";
    },
  },
};
</script>

<style src="../css/login.css"></style>
