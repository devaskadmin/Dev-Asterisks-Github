<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { API_BASE } from '@/config/env'
import { useAuth } from '@/composable/useAuth'

const props = defineProps({
  username: {
    type: String,
    default: 'User'
  },
  avatarSrc: {
    type: String,
    default: '/src/assets/images/admin.png'
  }
})

const { logout: authLogout, logoutInProgress, user: authUser } = useAuth()
const router = useRouter()
const isOpen = ref(false)
const dropdownRef = ref(null)
const buttonRef = ref(null)
const ignoreOutsideForOpenTick = ref(false)

const isMenuDebugEnabled = (() => {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage?.getItem('wa:profileMenuDebug') === '1'
  } catch {
    return false
  }
})()

const menuLog = (...args) => {
  if (!isMenuDebugEnabled) return
  console.log('[ProfileDropdown]', ...args)
}

const getViewportLabel = () => {
  if (typeof window === 'undefined') return 'unknown'
  return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop'
}

const getTargetSummary = (event) => {
  const target = event?.target
  if (!(target instanceof Element)) {
    return { tag: '', id: '', class: '' }
  }

  return {
    tag: String(target.tagName || '').toLowerCase(),
    id: String(target.id || '').slice(0, 80),
    class: String(target.className || '').replace(/\s+/g, ' ').trim().slice(0, 160),
  }
}

const sendMenuDebug = (entry) => {
  const url = `${API_BASE}/api/debug/mobile-menu`
  const body = JSON.stringify(entry)

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon(url, blob)
    return
  }

  fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // non-fatal diagnostics only
  })
}

const emitMenuDebug = ({ eventName, event = null, eventType = '', before = isOpen.value, after = isOpen.value }) => {
  const entry = {
    timestamp: new Date().toISOString(),
    eventName,
    menuStateBefore: Boolean(before),
    menuStateAfter: Boolean(after),
    eventTarget: getTargetSummary(event),
    eventType: String(eventType || event?.type || ''),
    currentRoute: String(router.currentRoute.value?.fullPath || ''),
    viewport: getViewportLabel(),
  }

  menuLog('debug-event', entry)
  sendMenuDebug(entry)
}

// Computed avatar URL with default fallback
const avatarUrl = computed(() => {
  if (props.avatarSrc && !props.avatarSrc.includes('admin.png')) {
    return props.avatarSrc
  }
  // Default avatar fallback
  return `${API_BASE}/images/avatar/default.png`
})

// Toggle dropdown open/close
const toggleDropdown = (event) => {
  const beforeState = isOpen.value
  const nextOpen = !beforeState
  if (nextOpen) {
    ignoreOutsideForOpenTick.value = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ignoreOutsideForOpenTick.value = false
      })
    })
  }
  isOpen.value = nextOpen
  emitMenuDebug({
    eventName: 'MENU_TOGGLE_CLICK',
    event,
    before: beforeState,
    after: nextOpen,
  })
  menuLog('toggle', { nextOpen, ignoreOutsideForOpenTick: ignoreOutsideForOpenTick.value })
}

// Close dropdown
const closeDropdown = (reason = 'unknown') => {
  const beforeState = isOpen.value
  if (!isOpen.value) {
    menuLog('close ignored (already closed)', { reason })
    return
  }
  isOpen.value = false
  emitMenuDebug({
    eventName: 'MENU_CLOSE',
    eventType: reason,
    before: beforeState,
    after: false,
  })
  menuLog('closed', { reason })
}

// Handle pointer/touch outside so mobile taps do not immediately collapse the menu.
const handlePointerOutside = (event) => {
  emitMenuDebug({
    eventName: event?.type === 'touchstart' ? 'TOUCH_START' : 'POINTER_DOWN',
    event,
    before: isOpen.value,
    after: isOpen.value,
  })

  if (!isOpen.value) {
    menuLog('outside ignored (menu closed)', { eventType: event?.type || 'unknown' })
    return
  }

  if (ignoreOutsideForOpenTick.value) {
    menuLog('outside ignored (same tap guard)', {
      eventType: event?.type || 'unknown',
    })
    return
  }

  const target = event.target
  if (target instanceof Element && target.closest('.profile-dropdown-wrapper')) {
    menuLog('outside ignored (inside wrapper via closest)', { eventType: event?.type || 'unknown' })
    return
  }

  const path = typeof event.composedPath === 'function' ? event.composedPath() : []

  if (path.length > 0) {
    if (path.includes(dropdownRef.value) || path.includes(buttonRef.value)) {
      menuLog('outside ignored (inside composedPath)', { eventType: event?.type || 'unknown' })
      return
    }
  } else if (
    (dropdownRef.value && dropdownRef.value.contains(target)) ||
    (buttonRef.value && buttonRef.value.contains(target))
  ) {
    menuLog('outside ignored (inside contains)', { eventType: event?.type || 'unknown' })
    return
  }

  if (dropdownRef.value && buttonRef.value) {
    emitMenuDebug({
      eventName: 'OUTSIDE_CLICK',
      event,
      before: isOpen.value,
      after: false,
    })
    closeDropdown('outside-pointer')
  }
}

// Handle keyboard escape key
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isOpen.value) {
    closeDropdown('escape')
  }
}

// Menu item handlers
const handleViewProfile = () => {
  closeDropdown('menu-item:view-profile')
  router.push({ name: 'view_profile' })
}

const handleAccountSettings = () => {
  closeDropdown('menu-item:account-settings')
  router.push({ name: 'user_settings' })
}

const handleHelp = () => {
  closeDropdown('menu-item:help')
  // Navigate to help page - adjust route name as needed
  router.push({ name: 'help' }).catch(() => {
    // Fallback: open help in current view or show notification
    console.log('Help page not configured')
  })
}

const handleSignOut = async () => {
  closeDropdown('menu-item:sign-out')
  // Use shared logout function from useAuth
  await authLogout()
}

let removeOutsideListener = () => {}

const registerOutsideListener = () => {
  window.addEventListener('pointerdown', handlePointerOutside, true)
  window.addEventListener('mousedown', handlePointerOutside, true)

  // Legacy fallback for browsers that do not emit pointer events consistently.
  const needsTouchFallback = !window.PointerEvent
  if (needsTouchFallback) {
    window.addEventListener('touchstart', handlePointerOutside, true)
  }

  menuLog('listener registered', {
    mode: needsTouchFallback ? 'pointerdown+mousedown+touchstart' : 'pointerdown+mousedown',
  })
  return () => {
    window.removeEventListener('pointerdown', handlePointerOutside, true)
    window.removeEventListener('mousedown', handlePointerOutside, true)
    if (needsTouchFallback) {
      window.removeEventListener('touchstart', handlePointerOutside, true)
    }
    menuLog('listener removed', {
      mode: needsTouchFallback ? 'pointerdown+mousedown+touchstart' : 'pointerdown+mousedown',
    })
  }
}

// Setup and cleanup event listeners
onMounted(() => {
  removeOutsideListener = registerOutsideListener()
  document.addEventListener('keydown', handleKeyDown)
  emitMenuDebug({ eventName: 'COMPONENT_MOUNT' })
  menuLog('mounted')
})

onUnmounted(() => {
  emitMenuDebug({ eventName: 'COMPONENT_UNMOUNT' })
  removeOutsideListener()
  document.removeEventListener('keydown', handleKeyDown)
  menuLog('unmounted')
})

// Close dropdown when route changes
const unsubscribe = router.afterEach(() => {
  emitMenuDebug({
    eventName: 'ROUTE_CHANGE',
    before: isOpen.value,
    after: false,
  })
  closeDropdown('route-change')
})

watch(isOpen, (next, prev) => {
  if (next === prev) return
  emitMenuDebug({
    eventName: next ? 'MENU_OPEN' : 'MENU_CLOSE',
    before: prev,
    after: next,
  })
})

watch(logoutInProgress, (next, prev) => {
  if (next === prev) return
  emitMenuDebug({
    eventName: 'AUTH_STATE_CHANGE',
    eventType: `logoutInProgress:${next}`,
    before: isOpen.value,
    after: isOpen.value,
  })
})

watch(
  () => Boolean(authUser?.value),
  (next, prev) => {
    if (next === prev) return
    emitMenuDebug({
      eventName: 'AUTH_STATE_CHANGE',
      eventType: `userSessionPresent:${next}`,
      before: isOpen.value,
      after: isOpen.value,
    })
  }
)

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <div class="profile-dropdown-wrapper">
    <!-- Profile Button -->
    <button
      ref="buttonRef"
      type="button"
      class="profile-dropdown-btn"
      :class="{ 'is-open': isOpen }"
      @pointerdown.stop
      @mousedown.stop
      @touchstart.stop="emitMenuDebug({ eventName: 'TOUCH_START', event: $event, before: isOpen, after: isOpen })"
      @click.stop="toggleDropdown($event)"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      aria-label="Open profile menu"
    >
      <img :src="avatarUrl" :alt="`${username}'s avatar`" class="profile-avatar">
    </button>

    <!-- Dropdown Menu -->
    <transition name="profile-dropdown-fade">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="profile-dropdown-menu"
        @pointerdown.stop
        @mousedown.stop
        @touchstart.stop
        role="menu"
        aria-label="Profile menu"
      >
        <!-- User Info Section -->
        <div class="dropdown-user-info">
          <div class="user-avatar-large">
            <img :src="avatarUrl" :alt="`${username}'s avatar`">
          </div>
          <div class="user-info-text">
            <p class="user-display-name">{{ username }}</p>
            <p class="user-email">View your profile</p>
          </div>
        </div>

        <!-- Divider -->
        <div class="dropdown-divider"></div>

        <!-- Menu Items -->
        <div class="dropdown-items">
          <!-- View Profile -->
          <button
            class="dropdown-item"
            @click="handleViewProfile"
            role="menuitem"
          >
            <span class="dropdown-icon">
              <i class="fa-regular fa-user"></i>
            </span>
            <span class="dropdown-label">View Profile</span>
          </button>

          <!-- Account Settings -->
          <button
            class="dropdown-item"
            @click="handleAccountSettings"
            role="menuitem"
          >
            <span class="dropdown-icon">
              <i class="fa-regular fa-gear"></i>
            </span>
            <span class="dropdown-label">Account Settings</span>
          </button>

          <!-- Help -->
          <button
            class="dropdown-item"
            @click="handleHelp"
            role="menuitem"
          >
            <span class="dropdown-icon">
              <i class="fa-regular fa-circle-question"></i>
            </span>
            <span class="dropdown-label">Help</span>
          </button>
        </div>

        <!-- Divider -->
        <div class="dropdown-divider"></div>

        <!-- Sign Out -->
        <div class="dropdown-items">
          <button
            class="dropdown-item dropdown-item-danger"
            @click="handleSignOut"
            :disabled="logoutInProgress"
            role="menuitem"
          >
            <span class="dropdown-icon">
              <i class="fa-regular fa-arrow-right-from-bracket"></i>
            </span>
            <span class="dropdown-label" v-if="logoutInProgress">Signing out...</span>
            <span class="dropdown-label" v-else>Sign Out</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.profile-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

/* Profile Button */
.profile-dropdown-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  outline: none;
}

.profile-dropdown-btn:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: scale(1.05);
}

.profile-dropdown-btn.is-open {
  border-color: rgba(59, 130, 246, 0.5);
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

@media (max-width: 768px) {
  .profile-dropdown-btn {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .profile-dropdown-btn {
    width: 38px;
    height: 38px;
  }
}

/* Dropdown Menu */
.profile-dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  background: var(--dropdown-bg, #112143);
  border: 1px solid var(--dropdown-border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.25);
  min-width: 280px;
  z-index: 1050;
  overflow: hidden;
}

/* Arrow/Pointer */
.profile-dropdown-menu::before {
  content: '';
  position: absolute;
  top: -8px;
  right: 16px;
  width: 14px;
  height: 14px;
  background: var(--dropdown-bg, #112143);
  border: 1px solid var(--dropdown-border, rgba(255, 255, 255, 0.1));
  border-bottom: none;
  border-right: none;
  border-radius: 3px 0 0 0;
  transform: rotate(45deg);
  z-index: -1;
}

/* User Info Section */
.dropdown-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--dropdown-header-bg, rgba(255, 255, 255, 0.03));
}

.user-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(59, 130, 246, 0.3);
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info-text {
  flex: 1;
  min-width: 0;
}

.user-display-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dropdown-text, #c8d4f0);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: var(--dropdown-subtext, #8b97b2);
  margin: 4px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Divider */
.dropdown-divider {
  height: 1px;
  background: var(--dropdown-divider, rgba(255, 255, 255, 0.08));
  margin: 0;
}

/* Menu Items Container */
.dropdown-items {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

/* Menu Item */
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--dropdown-text, #c8d4f0);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  outline: none;
  position: relative;
}

.dropdown-item:hover {
  background: var(--dropdown-hover-bg, rgba(59, 130, 246, 0.15));
  color: var(--dropdown-text-hover, #ffffff);
  padding-left: 18px;
}

.dropdown-item:active {
  background: var(--dropdown-active-bg, rgba(59, 130, 246, 0.25));
}

/* Danger variant for Sign Out */
.dropdown-item-danger {
  color: var(--dropdown-danger-text, #f87171);
}

.dropdown-item-danger:hover {
  background: var(--dropdown-danger-bg, rgba(248, 113, 113, 0.1));
  color: var(--dropdown-danger-hover, #fca5a5);
}

/* Icon */
.dropdown-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  flex-shrink: 0;
  font-size: 16px;
}

.dropdown-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Transition/Animation */
.profile-dropdown-fade-enter-active {
  animation: profileDropdownSlideIn 0.2s ease-out forwards;
}

.profile-dropdown-fade-leave-active {
  animation: profileDropdownSlideOut 0.15s ease-in forwards;
}

@keyframes profileDropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes profileDropdownSlideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* Responsive */
@media (max-width: 576px) {
  .profile-dropdown-menu {
    min-width: 240px;
    right: -20px;
  }

  .dropdown-user-info {
    flex-direction: column;
    text-align: center;
    padding: 12px;
  }

  .user-avatar-large {
    margin-bottom: 4px;
  }

  .user-display-name,
  .user-email {
    text-align: center;
  }

  .dropdown-item {
    padding: 8px 12px;
  }

  .dropdown-item:hover {
    padding-left: 14px;
  }
}
</style>
