<script setup>
import {computed, onMounted, onUnmounted, provide, ref, shallowRef, watch} from "vue";
import {RouterView, useRoute} from 'vue-router';
import {OverlayScrollbars} from "overlayscrollbars";
import {changeCurrentTheme, currentActiveTheme, sanitizeTheme, getDefaultTheme} from "@/composable/manageThemeSetting.js";
import {layoutDirection, setLtr} from "@/composable/themeDirectionSetting";
import {setStyleSheet} from "@/composable/primaryColorChangeSetting";
import {useMainContentCurrentBG} from "@/composable/mainContentBackgroundSetting";
import {preloader} from "@/composable/disableEnablePreloaderSetting";
import {hoverableMenu, handleNavbarSize} from "@/composable/navbarSizeSetting";
import {layoutPosition, handleNavPositionClick} from "@/composable/navPositionSetting";
import { useAuth } from '@/composable/useAuth';

import FooterComponent from "@/components/FooterComponent.vue";
import MainSidebarComponent from "@/components/MainSidebarComponent.vue";
import HeaderComponent from "@/components/HeaderComponent.vue";
import ProfileRightSidebarComponent from "@/components/ProfileRightSidebarComponent.vue";
import AppBottomNav from "@/components/navigation/AppBottomNav.vue";

import router from '@/router/index'
import layouts from "@/layouts";




const route = useRoute();
const authStore = useAuth()

const layout = shallowRef('div');
const isPartials = ref(false);
const isMobileBottomNav = ref(false);
const isMobileMenuOpen = ref(false);

let mobileNavMql = null;

const isExpanded = ref(false);
const isSmall = ref(false);
const isCollapsed = ref(false);
const isExpandedBody = ref(false);
const showSidebarLinkGroup = ref(false);
const isSidebarMini = ref(false);
const isSubMenuCollapsed = ref(false);
const hasFixedSidebar = ref(false);
const isTwoColumnMenu = ref(false);

const normalizedRole = computed(() => {
  return String(
    authStore.user?.value?.role ||
    authStore.user?.value?.roleSlug ||
    authStore.user?.role ||
    authStore.user?.roleSlug ||
    ''
  ).trim().toLowerCase()
})

const isAdmin = computed(() => ['admin', 'administrator'].includes(normalizedRole.value))

const CANONICAL_THEME = getDefaultTheme()
const CANONICAL_DIRECTION = 'ltr'
const CANONICAL_COLOR = import.meta.env.VITE_DEFAULT_COLOR || 'blue-color'
const LEGACY_THEME_OVERRIDE_KEYS = [
  'hideThemeSidebar',
  'navbackgroundImage',
  'mainBackgroundImage',
  'sidebarHover',
  'sidebarSmall',
  'preloaderEnabled',
]

const isActive = ref(false);
const profileBtnId = ref('');
const dataBsToggle = ref('');

const profileToggleDropdown = (event) => {
  if (event.target.checked) {
    profileBtnId.value = '';
    dataBsToggle.value = 'dropdown';
    isActive.value = false;
    document.body.classList.remove('overflow-hidden');
  } else {
    profileBtnId.value = 'profileDropdown';
    dataBsToggle.value = '';
    isActive.value = true;
    document.body.classList.add('overflow-hidden');
  }
};

const handleProfileClick = (event) => {
  isActive.value = true;
  document.body.classList.add('overflow-hidden');
  event.stopPropagation();
};

const closeProfileSidebar = (event) => {
  isActive.value = false;
  document.body.classList.remove('overflow-hidden');
};

const onNavCloseClick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (window.innerWidth > 1199) {
    isExpanded.value = !isExpanded.value;
    isSmall.value = !isSmall.value;
    if (!isTwoColumnMenu.value) {
      isCollapsed.value = !isCollapsed.value;
    }
    isExpandedBody.value = !isExpandedBody.value;
    showSidebarLinkGroup.value = true;
  } else {
    isSidebarMini.value = !isSidebarMini.value;
    isCollapsed.value = false;
  }
  if (isCollapsed.value) {
    // Destroy overlay scrollbars
  } else {
    // Initialize overlay scrollbars
  }
  if (isTwoColumnMenu.value) {
    // Initialize overlay scrollbars
    isSubMenuCollapsed.value = !isSubMenuCollapsed.value;
    isCollapsed.value = true;
    hasFixedSidebar.value = true;
  }
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
  isSidebarMini.value = false;
  document.body.classList.remove('wa-mobile-menu-open');
};

const openMobileMenu = () => {
  if (!isMobileBottomNav.value) return;
  isMobileMenuOpen.value = true;
  isSidebarMini.value = true;
  document.body.classList.add('wa-mobile-menu-open');
};

const syncMobileViewportState = (matches) => {
  isMobileBottomNav.value = matches;
  document.body.classList.toggle('wa-mobile-nav-active', matches);

  if (!matches) {
    closeMobileMenu();
  }
};

const onMobileViewportChange = (event) => {
  syncMobileViewportState(Boolean(event?.matches));
};

const onMobileSidebarClick = (event) => {
  if (!isMobileBottomNav.value) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('a.sidebar-link')) {
    closeMobileMenu();
  }
};

const closeMainLeftSidebar = (() => {
  if (isMobileBottomNav.value) {
    return;
  }
  isSidebarMini.value = false
})

const onDocumentClick = (e) => {
  if (!e.target.matches('.main-sidebar *')) {
    // isSidebarMini.value = false;
    if (window.innerWidth < 1200) {
      if (isTwoColumnMenu.value) {
        isSubMenuCollapsed.value = true;
      }
    }
  }
};

const applyBodyThemeClass = (themeValue) => {
  const normalizedTheme = sanitizeTheme(themeValue);
  const element = document.body;

  if (normalizedTheme === 'light-theme') {
    element.classList.remove('dark-theme');
    element.classList.add('light-theme');
  } else if (normalizedTheme === 'dark-theme') {
    element.classList.add('dark-theme');
    element.classList.remove('light-theme');
  } else {
    element.classList.remove('light-theme');
    element.classList.remove('dark-theme');
  }
};

const applyCanonicalAppearance = () => {
  LEGACY_THEME_OVERRIDE_KEYS.forEach((key) => localStorage.removeItem(key));

  const hasNavbarControls = Boolean(document.querySelector('.nav-close-btn'));

  if (isProtectedUiRoute() && hasNavbarControls) {
    handleNavbarSize();
    handleNavPositionClick('vertical');
  }

  setLtr();
  setStyleSheet(CANONICAL_COLOR);
  changeCurrentTheme(CANONICAL_THEME);
  useMainContentCurrentBG();

  currentActiveTheme.value = sanitizeTheme(localStorage.getItem('currentActiveTheme') || CANONICAL_THEME);
  applyBodyThemeClass(currentActiveTheme.value);
  if (layoutDirection.value !== CANONICAL_DIRECTION) {
    layoutDirection.value = CANONICAL_DIRECTION;
  }
};

const isProtectedUiRoute = (routeLike = route) => {
  return Boolean(routeLike?.meta?.isPartials);
};

const syncRouteShellState = (routeLike = route) => {
  isPartials.value = Boolean(routeLike?.meta?.isPartials);
  layout.value = layouts[routeLike?.meta?.layout] || 'div';
};

onMounted(() => {
  authStore.fetchUser()

  const elements = document.querySelectorAll('.scrollable');
  elements.forEach((element) => {
    OverlayScrollbars(element, {});
  });

  // Ensure the startup preloader always clears after initial render.
  // (Users can still manually re-enable it from theme settings.)
  window.setTimeout(() => {
    preloader.value = false;
  }, 600);

  document.addEventListener('click', onDocumentClick);
  syncRouteShellState(route)
  applyCanonicalAppearance()

  mobileNavMql = window.matchMedia('(max-width: 768px)');
  syncMobileViewportState(mobileNavMql.matches);
  if (mobileNavMql.addEventListener) {
    mobileNavMql.addEventListener('change', onMobileViewportChange);
  } else if (mobileNavMql.addListener) {
    mobileNavMql.addListener(onMobileViewportChange);
  }
  // useDisableEnablePreloader()
});

onUnmounted(() => {
  if (mobileNavMql?.removeEventListener) {
    mobileNavMql.removeEventListener('change', onMobileViewportChange);
  } else if (mobileNavMql?.removeListener) {
    mobileNavMql.removeListener(onMobileViewportChange);
  }
  document.body.classList.remove('wa-mobile-nav-active');
  document.body.classList.remove('wa-mobile-menu-open');
})

watch(layoutDirection, () => {
  let element = document.documentElement
  if (layoutDirection.value === 'rtl') {
    element.setAttribute('dir', 'rtl');
  } else {
    element.removeAttribute('dir');
  }
})

watch(currentActiveTheme, () => {
  currentActiveTheme.value = sanitizeTheme(currentActiveTheme.value);
  applyBodyThemeClass(currentActiveTheme.value);
})

watch(
  () => route.fullPath,
  () => {
    syncRouteShellState(route);
  },
  { immediate: true }
)

router.afterEach((to) => {
  syncRouteShellState(to)

  if (isMobileBottomNav.value) {
    closeMobileMenu();
  }

  if (isProtectedUiRoute(to)) {
    applyCanonicalAppearance()
  }
});

provide('app:layout', layout.value)
</script>

<template>
  <div
    :class="[
      isPartials ? 'body-padding body-p-top' : 'wa-guest-shell',
      {
        expanded: isPartials && isExpandedBody,
        'light-theme': currentActiveTheme === 'light-theme',
        'dark-theme': currentActiveTheme === 'dark-theme',
        'hover-menu': isPartials && hoverableMenu,
        'has-horizontal': isPartials && layoutPosition === 'horizontal',
        'has-two-column-menu has-fixed-sidebar': isPartials && layoutPosition === 'twoColumn',
      }
    ]"
  >
    <!-- preloader start -->
    <transition name="fade" mode="out-in">
    <div class="preloader" :class="{'d-none ': !preloader}">
      <div class="loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    </transition>
    <!-- preloader end -->
      <!-- header start -->
        <HeaderComponent v-if="isPartials"
          :onNavCloseClick="onNavCloseClick"
          :isExpanded="isExpanded"
          :toggleSidebar="() => {}"
          :canUseThemeSettings="false"
          :profileToggleSidebar="handleProfileClick"
      />
      <!-- header end -->

      <!-- profile right sidebar start -->
      <ProfileRightSidebarComponent v-if="isPartials"
        :isActive="isActive"
        :profileToggleDropdown="profileToggleDropdown"
        :closeProfileSidebar="closeProfileSidebar"
      />
      <!-- profile right sidebar end -->

      <!-- main sidebar start -->
        <MainSidebarComponent v-if="isPartials && (!isMobileBottomNav || isMobileMenuOpen)"
            class="wa-main-sidebar"
            :class="{ 'wa-mobile-drawer-open': isMobileMenuOpen }"
          :isCollapsed="isCollapsed"
          :isTwoColumnMenu="isTwoColumnMenu"
          :isSidebarMini="isSidebarMini"
          :isSubMenuCollapsed="isSubMenuCollapsed"
          :closeMainLeftSidebar="closeMainLeftSidebar"
            @click.capture="onMobileSidebarClick"
      />
      <!-- main sidebar end -->

        <div
          v-if="isPartials && isMobileBottomNav && isMobileMenuOpen"
          class="wa-mobile-menu-backdrop"
          @click="closeMobileMenu"
        ></div>

        <button
          v-if="isPartials && isMobileBottomNav && isMobileMenuOpen"
          type="button"
          class="wa-mobile-menu-close"
          aria-label="Close menu"
          @click="closeMobileMenu"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
    
    <!-- main content start -->
    <component :is="layout">
      <RouterView/>
    </component>
    <AppBottomNav
      v-if="isPartials && isMobileBottomNav"
      :moreActive="isMobileMenuOpen"
      @more="openMobileMenu"
    />
    <FooterComponent v-if="isPartials"/>

  </div>
</template>

<style lang="scss">
.mx-calendar-header .mx-btn-icon-left i,
.mx-calendar-header .mx-btn-icon-right i,
.mx-calendar-header .mx-btn-icon-double-left i,
.mx-calendar-header .mx-btn-icon-double-right i {
  color: #000000 !important;
  font-size: 1.2em !important;
  opacity: 1 !important;
}

.mx-calendar-header .mx-btn:hover i {
  color: #007bff !important;
}

body.wa-dashboard-active {
  --wa-shell-bg: var(--wa-page-bg);
  --wa-shell-bg-secondary: var(--wa-page-bg);
  --wa-shell-header: var(--wa-topbar-bg);
  --wa-shell-sidebar: var(--wa-sidebar-bg);
  --wa-shell-surface: var(--wa-panel-bg);
  --wa-shell-surface-elevated: var(--wa-card-bg);
  --wa-shell-surface-soft: var(--wa-control-bg);
  --wa-shell-border: var(--wa-border);
  --wa-shell-border-strong: var(--wa-border-strong);
  --wa-shell-divider: var(--wa-border);
  --wa-shell-text: var(--wa-text-primary);
  --wa-shell-text-secondary: var(--wa-text-secondary);
  --wa-shell-text-muted: var(--wa-text-muted);
  --wa-shell-accent: var(--wa-action-blue);
  --wa-shell-accent-soft: color-mix(in srgb, var(--wa-shell-accent) 14%, transparent 86%);
  --wa-shell-accent-soft-strong: color-mix(in srgb, var(--wa-shell-accent) 22%, transparent 78%);
  background: var(--wa-shell-bg) !important;
}

body.wa-dashboard-active,
body.wa-dashboard-active #app,
body.wa-dashboard-active .app,
body.wa-dashboard-active .body-padding {
  background: var(--wa-shell-bg) !important;
  color: var(--wa-shell-text) !important;
}

body.wa-dashboard-active .main-content {
  background: var(--wa-shell-bg-secondary) !important;
}

body.wa-dashboard-active .top-navbar {
  background: var(--wa-shell-header) !important;
  border-color: var(--wa-shell-divider) !important;
}

body.wa-dashboard-active .main-sidebar,
body.wa-dashboard-active .main-sidebar::after {
  background: var(--wa-shell-sidebar) !important;
  border-color: var(--wa-shell-divider) !important;
}

body.wa-dashboard-active .main-sidebar .sidebar-link-group-title,
body.wa-dashboard-active .main-sidebar .sidebar-link-group-title.sidebar-section-header,
body.wa-dashboard-active .main-sidebar .sidebar-link-group-title.app-header-gradient {
  background: linear-gradient(90deg, #133275 0%, #0b2058 40%, #091129 100%) !important;
  border-bottom-color: var(--wa-shell-divider) !important;
}

body.wa-dashboard-active .wa-date-picker-wrap .input-group.dashboard-filter,
body.wa-dashboard-active .main-content .dashboard-filter {
  background: transparent !important;
  border: 0 !important;
}

body.wa-dashboard-active .wa-date-picker-wrap .mx-input,
body.wa-dashboard-active .wa-date-picker-wrap .mx-icon-calendar,
body.wa-dashboard-active .wa-date-picker-wrap .mx-icon-clear {
  background: var(--wa-shell-surface-elevated) !important;
  border: 1px solid var(--wa-shell-border) !important;
  color: var(--wa-shell-text) !important;
}

body.wa-dashboard-active .wa-date-picker-wrap .mx-input::placeholder {
  color: var(--wa-shell-text-muted) !important;
}

body.wa-dashboard-active .mx-datepicker-main,
body.wa-dashboard-active .mx-datepicker-sidebar,
body.wa-dashboard-active .mx-datepicker-content {
  background: var(--wa-shell-surface-elevated) !important;
  border-color: var(--wa-shell-border) !important;
  color: var(--wa-shell-text) !important;
}

body.wa-dashboard-active .mx-calendar-header .mx-btn-icon-left i,
body.wa-dashboard-active .mx-calendar-header .mx-btn-icon-right i,
body.wa-dashboard-active .mx-calendar-header .mx-btn-icon-double-left i,
body.wa-dashboard-active .mx-calendar-header .mx-btn-icon-double-right i {
  color: var(--wa-shell-text-muted) !important;
}

body.wa-dashboard-active .mx-calendar-header .mx-btn:hover i {
  color: var(--wa-shell-accent) !important;
}

/* ── WorkoutAtlas layout cleanup ─────────────────────────── */

/* Sidebar right border — separates sidebar from content area */
.main-sidebar {
  border-right: 1px solid var(--wa-shell-divider, rgba(255, 255, 255, 0.09)) !important;
}

@media (max-width: 991px) {

  html,
  body,
  #app {
    width: 100%;
    max-width: 100%;
  }

  .body-padding {
    padding-left: 0 !important;
    max-width: 100%;
  }

  .body-padding .main-content {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: visible;
    padding-inline: 12px !important;
    padding-bottom: var(--wa-mobile-bottom-nav-clearance, 0px);
  }

  .body-padding .main-content > *,
  .body-padding .main-content .page-wrapper,
  .body-padding .main-content .content-wrapper,
  .body-padding .main-content .app-page-shell,
  .body-padding .main-content .app-page-canvas,
  .body-padding .main-content .app-inner-shell {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .body-padding .main-content .table-responsive,
  .body-padding .main-content .table-wrapper,
  .body-padding .main-content .tabs,
  .body-padding .main-content .tab-content {
    max-width: 100%;
    min-width: 0;
  }
}

@media (max-width: 768px) {
  :root {
    --wa-mobile-bottom-nav-height: 70px;
    --wa-mobile-bottom-nav-gap: 10px;
    --wa-mobile-bottom-nav-clearance: calc(var(--wa-mobile-bottom-nav-height) + var(--wa-mobile-bottom-nav-gap) + 12px + env(safe-area-inset-bottom));
  }

  body.wa-mobile-menu-open {
    overflow: hidden;
  }

  .main-sidebar.wa-main-sidebar {
    display: none !important;
  }

  .main-sidebar.wa-main-sidebar.wa-mobile-drawer-open {
    display: block !important;
    position: fixed !important;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100% !important;
    max-width: 100% !important;
    height: 100dvh;
    max-height: 100dvh;
    z-index: 1410;
    transform: none !important;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
    background: #0b1630 !important;
    border-right: 0 !important;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .main-sidebar.wa-main-sidebar.wa-mobile-drawer-open,
  .main-sidebar.wa-main-sidebar.wa-mobile-drawer-open::after {
    background: #0b1630 !important;
  }

  .main-sidebar.wa-main-sidebar.wa-mobile-drawer-open .main-menu,
  .main-sidebar.wa-main-sidebar.wa-mobile-drawer-open .wa-sidebar-scroll {
    max-height: 100dvh;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }

  .main-sidebar.wa-main-sidebar.wa-mobile-drawer-open .wa-sidebar-scroll {
    box-sizing: border-box;
    padding-top: calc(62px + env(safe-area-inset-top));
    padding-bottom: calc(120px + env(safe-area-inset-bottom));
  }

  .wa-mobile-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1400;
    background: rgba(5, 12, 24, 0.56);
  }

  .wa-mobile-menu-close {
    position: fixed;
    top: calc(10px + env(safe-area-inset-top));
    right: 12px;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 12px;
    background: rgba(14, 29, 58, 0.92);
    color: #e2e8f0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    cursor: pointer;
    z-index: 1420;
  }

  .body-padding .main-content {
    padding-bottom: max(100px, var(--wa-mobile-bottom-nav-clearance, 0px));
  }
}

/* Add breathing room between sidebar and dashboard on desktop */
@media (min-width: 992px) {
  .body-padding .main-content {
    padding-left: 36px !important;
    padding-right: 28px !important;
  }
}

/* ── Dark sidebar: override light-theme global rules ─────── */
/* style.css sets light-theme sidebar to #fff — cancel that */
.light-theme .main-sidebar,
.light-theme .main-sidebar::after,
.dark-theme .main-sidebar,
.dark-theme .main-sidebar::after {
  background-color: var(--wa-shell-sidebar, #0a0f15) !important;
  background: var(--wa-shell-sidebar, #0a0f15) !important;
}

/* Collapsed two-column dropdown panel (light-theme sets bg: #fff, #f5f5f5) */
.light-theme .collapsed .sidebar-dropdown-menu,
.light-theme .collapsed .sidebar-item .sidebar-link.has-sub.show {
  background: var(--wa-shell-surface-elevated, #17212d) !important;
}
.light-theme .collapsed .sidebar-item .sidebar-link.has-sub.show .nav-icon {
  color: var(--wa-shell-text-secondary, #a5afbd) !important;
}

/* Section header gradient variable — overridden to dark surface */
.main-sidebar .sidebar-link-group-title.sidebar-section-header {
  --ff-page-header-gradient: transparent !important;
  --ff-page-header-bg: rgba(255, 255, 255, 0.04) !important;
  background: rgba(255, 255, 255, 0.04) !important;
  background-image: none !important;
  color: var(--wa-shell-text-muted, #748094) !important;
}

/* Light-theme link colors — keep dark */
.light-theme .sidebar-item .sidebar-link .nav-icon,
.light-theme .sidebar-item .sidebar-dropdown-item .sidebar-link {
  color: var(--wa-shell-text-secondary, #a5afbd) !important;
}
.light-theme .sidebar-link-group-title {
  color: var(--wa-shell-text-muted, #748094) !important;
}
</style>

