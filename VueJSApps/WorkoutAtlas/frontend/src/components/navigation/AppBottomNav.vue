<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const emit = defineEmits(['more'])

const props = defineProps({
  moreActive: {
    type: Boolean,
    default: false,
  },
})

const navItems = [
  {
    label: 'Home',
    to: '/dashboard',
    icon: 'fa-solid fa-house',
    matches: ['/dashboard'],
  },
  {
    label: 'Log',
    to: '/workout-log',
    icon: 'fa-solid fa-dumbbell',
    matches: ['/workout-log', '/workouts'],
  },
  {
    label: 'Build',
    to: '/workout-builder',
    icon: 'fa-solid fa-clipboard-list',
    matches: ['/workout-builder'],
  },
  {
    label: 'Nutrition',
    to: '/Nutrition',
    icon: 'fa-solid fa-apple-whole',
    matches: ['/Nutrition'],
  },
  {
    label: 'More',
    to: null,
    icon: 'fa-solid fa-bars',
    matches: [],
    action: 'more',
  },
]

const currentPath = computed(() => String(route.path || ''))

const isActive = (item) => {
  if (item.action === 'more') {
    return props.moreActive
  }
  return item.matches.some((prefix) => currentPath.value === prefix || currentPath.value.startsWith(`${prefix}/`))
}

const handleNavClick = (item, event) => {
  if (item.action !== 'more') return
  event.preventDefault()
  emit('more')
}
</script>

<template>
  <nav class="wa-app-bottom-nav" aria-label="Bottom navigation" role="navigation">
    <component
      v-for="item in navItems"
      :is="item.to ? 'router-link' : 'button'"
      :key="item.label"
      :to="item.to || undefined"
      :type="item.to ? undefined : 'button'"
      class="wa-app-bottom-link"
      :class="{ 'is-active': isActive(item) }"
      :aria-current="isActive(item) ? 'page' : undefined"
      @click="handleNavClick(item, $event)"
    >
      <i :class="item.icon"></i>
      <span>{{ item.label }}</span>
    </component>
  </nav>
</template>

<style scoped>
.wa-app-bottom-nav {
  --wa-mobile-bottom-nav-height: var(--wa-mobile-bottom-nav-height, 70px);
  --wa-mobile-bottom-nav-gap: var(--wa-mobile-bottom-nav-gap, 10px);
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: env(safe-area-inset-bottom);
  z-index: 1300;
  height: var(--wa-mobile-bottom-nav-height);
  border-radius: 16px;
  border: 1px solid var(--wa-border, rgba(145, 160, 200, 0.24));
  background: color-mix(in srgb, var(--wa-panel-bg, #1b2444) 92%, transparent 8%);
  backdrop-filter: blur(10px);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 4px;
  box-sizing: border-box;
}

.wa-app-bottom-link {
  appearance: none;
  border: 0;
  background: transparent;
  text-decoration: none;
  color: var(--wa-text-secondary, #c7d0e3);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  min-width: 0;
  cursor: pointer;
}

.wa-app-bottom-link i {
  font-size: 14px;
}

.wa-app-bottom-link.is-active {
  color: var(--wa-action-blue, #4c7bff);
  background: color-mix(in srgb, var(--wa-action-blue, #4c7bff) 18%, transparent 82%);
}

.wa-app-bottom-nav {
  display: none;
}

@media (min-width: 601px) {
  .wa-app-bottom-nav {
    display: none;
  }
}

@media (max-width: 600px) {
  .wa-app-bottom-nav {
    display: grid;
  }
}
</style>