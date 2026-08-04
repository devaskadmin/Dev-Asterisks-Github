<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="help-container">
    <div class="help-header">
      <div class="help-title">
        <h1>Help & Support</h1>
        <p>Find answers to common questions and get support</p>
      </div>
    </div>

    <div class="help-content">
      <div class="help-section">
        <h2>Getting Started</h2>
        <div class="help-items">
          <div class="help-item">
            <h3>Dashboard Overview</h3>
            <p>Learn how to navigate the WorkoutAtlas dashboard and access key features.</p>
          </div>
          <div class="help-item">
            <h3>Creating a Workout</h3>
            <p>Step-by-step guide to creating your first workout plan.</p>
          </div>
          <div class="help-item">
            <h3>Nutrition Tracking</h3>
            <p>How to log meals and track your daily nutrition intake.</p>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h2>Account & Settings</h2>
        <div class="help-items">
          <div class="help-item">
            <h3>Profile Management</h3>
            <p>Update your profile information, avatar, and personal details.</p>
          </div>
          <div class="help-item">
            <h3>Privacy & Security</h3>
            <p>Information about data security, password management, and privacy settings.</p>
          </div>
          <div class="help-item">
            <h3>Preferences</h3>
            <p>Customize your app preferences and notification settings.</p>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h2>Troubleshooting</h2>
        <div class="help-items">
          <div class="help-item">
            <h3>Common Issues</h3>
            <p>Solutions to frequently encountered problems.</p>
          </div>
          <div class="help-item">
            <h3>Contact Support</h3>
            <p>Reach out to our support team for additional assistance.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="help-footer">
      <button @click="goBack" class="btn-back">
        <i class="fa-light fa-arrow-left"></i> Back
      </button>
    </div>
  </div>
</template>

<style scoped>
.help-container {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: 14px;
  box-sizing: border-box;
  color: var(--wa-shell-text, #f8fafc);
  opacity: 1;
  filter: none;
  overflow-x: clip;
}

.help-header {
  margin-bottom: 18px;
  text-align: center;
  padding: 16px 14px;
  background: linear-gradient(180deg, rgba(28, 46, 94, 0.98), rgba(20, 33, 70, 0.98));
  border: 1px solid rgba(82, 118, 210, 0.5);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}

.help-title h1 {
  font-size: clamp(1.25rem, 3.8vw, 1.4rem);
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.2;
  color: #f8fafc;
}

.help-title p {
  font-size: clamp(0.82rem, 2.8vw, 0.9rem);
  color: #b9c6e4;
  margin: 0;
  line-height: 1.4;
}

.help-content {
  margin-bottom: 18px;
}

.help-section {
  margin-bottom: 18px;
}

.help-section h2 {
  font-size: clamp(0.95rem, 3.2vw, 1.06rem);
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 8px;
  color: #7fa8ff;
}

.help-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}

.help-item {
  background: rgba(27, 43, 83, 0.94);
  border: 1px solid rgba(72, 106, 190, 0.45);
  border-radius: 11px;
  padding: 13px 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
  transition: all 0.3s ease;
}

.help-item:hover {
  background: rgba(33, 53, 102, 0.96);
  border-color: rgba(96, 134, 228, 0.56);
  transform: translateY(-1px);
}

.help-item h3 {
  font-size: clamp(0.88rem, 2.8vw, 0.95rem);
  font-weight: 700;
  line-height: 1.25;
  margin: 0 0 5px 0;
  color: #f8fafc;
}

.help-item p {
  font-size: clamp(0.78rem, 2.5vw, 0.83rem);
  color: #b6c2dc;
  margin: 0;
  line-height: 1.42;
}

.help-footer {
  text-align: center;
  padding-top: 14px;
  border-top: 1px solid rgba(82, 118, 210, 0.26);
}

.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  background: rgba(52, 92, 190, 0.24);
  border: 1px solid rgba(92, 129, 224, 0.42);
  color: #dbeafe;
  border-radius: 10px;
  font-size: 0.87rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: rgba(59, 130, 246, 0.34);
  border-color: rgba(125, 164, 255, 0.6);
}

.btn-back:focus-visible {
  outline: 2px solid rgba(125, 164, 255, 0.9);
  outline-offset: 2px;
}

/* Light theme support */
:global(body.light-theme) .help-header {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(99, 102, 241, 0.05));
}

:global(body.light-theme) .help-title h1 {
  color: #1a202c;
}

:global(body.light-theme) .help-title p {
  color: #718096;
}

:global(body.light-theme) .help-section h2 {
  color: #2d3748;
}

:global(body.light-theme) .help-item {
  background: rgba(59, 130, 246, 0.03);
  border-color: rgba(59, 130, 246, 0.1);
}

:global(body.light-theme) .help-item:hover {
  background: rgba(59, 130, 246, 0.08);
}

:global(body.light-theme) .help-item h3 {
  color: #1a202c;
}

:global(body.light-theme) .help-item p {
  color: #718096;
}

:global(body.light-theme) .help-footer {
  border-color: rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .help-container {
    padding: 12px;
    max-width: 100%;
  }

  .help-header {
    padding: 15px 12px;
    margin-bottom: 14px;
  }

  .help-title h1 {
    font-size: 1.28rem;
  }

  .help-title p {
    font-size: 0.85rem;
  }

  .help-section {
    margin-bottom: 14px;
  }

  .help-section h2 {
    margin-bottom: 7px;
  }

  .help-items {
    grid-template-columns: 1fr;
    gap: 9px;
  }

  .help-item {
    padding: 12px 13px;
  }

  .btn-back {
    width: 100%;
  }
}

@media (min-width: 992px) {
  .help-container {
    padding: 18px;
  }

  .help-header {
    margin-bottom: 20px;
    padding: 18px 16px;
  }

  .help-section {
    margin-bottom: 20px;
  }

  .help-items {
    gap: 12px;
  }
}
</style>
