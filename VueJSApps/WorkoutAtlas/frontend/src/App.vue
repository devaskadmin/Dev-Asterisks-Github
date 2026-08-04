<script setup>
import {computed, onMounted, onUnmounted, provide, ref, shallowRef, watch} from "vue";
import {RouterView, useRoute} from 'vue-router';
import {OverlayScrollbars} from "overlayscrollbars";
import {changeCurrentTheme, currentActiveTheme, sanitizeTheme, syncThemePreference} from "@/composable/manageThemeSetting.js";
import {layoutDirection, setRtl, setLtr} from "@/composable/themeDirectionSetting";
import {selectedStyleSheet, setStyleSheet} from "@/composable/primaryColorChangeSetting";
import {useMainContentCurrentBG} from "@/composable/mainContentBackgroundSetting";
import {preloader} from "@/composable/disableEnablePreloaderSetting";
import {hoverableMenu, currentNavbarSize, handleNavbarSize, sidebarHoverClick, sidebarSmallClick} from "@/composable/navbarSizeSetting";
import {layoutPosition, handleNavPositionClick} from "@/composable/navPositionSetting";
import { API_BASE } from '@/config/env';
import { useAuth } from '@/composable/useAuth';

import FooterComponent from "@/components/FooterComponent.vue";
import MainSidebarComponent from "@/components/MainSidebarComponent.vue";
import HeaderComponent from "@/components/HeaderComponent.vue";
import RightSidebarComponent from "@/components/RightSidebarComponent.vue";
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

const isSidebarActive = ref(false);
const isBodyOverflowHidden = ref(false);
const hideThemeSidebar = ref(localStorage.getItem('hideThemeSidebar') === 'true');

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
const canShowThemeControls = computed(() => isAdmin.value && !hideThemeSidebar.value)

const isActive = ref(false);
const profileBtnId = ref('');
const dataBsToggle = ref('');

const isLightTheme = computed(() => {
  return currentActiveTheme.value === 'light-theme';
})

const profileToggleSidebar = (event) => {
  if (event.target.checked) {
    profileBtnId.value = 'profileDropdown';
    dataBsToggle.value = '';
    isActive.value = true;
    document.body.classList.add('overflow-hidden');
  } else {
    profileBtnId.value = '';
    dataBsToggle.value = 'dropdown';
    isActive.value = false;
    document.body.classList.remove('overflow-hidden');
  }
};

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

const toggleSidebar = (e) => {
  if (!isAdmin.value) {
    closeSidebar()
    return
  }
  e.stopPropagation();
  isSidebarActive.value = !isSidebarActive.value;
  isBodyOverflowHidden.value = !isBodyOverflowHidden.value;
};

const closeSidebar = () => {
  isSidebarActive.value = false;
  isBodyOverflowHidden.value = false;
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

const applyThemeConfig = (themeConfig = {}) => {
  if (!isAdmin.value) {
    closeSidebar()
    return
  }
  if (!themeConfig || typeof themeConfig !== 'object') return;

  if (themeConfig.themeColor) {
    changeCurrentTheme(themeConfig.themeColor);
  }

  if (themeConfig.themeDirection === 'rtl') {
    setRtl();
  } else if (themeConfig.themeDirection === 'ltr') {
    setLtr();
  }

  if (themeConfig.primaryColor) {
    setStyleSheet(themeConfig.primaryColor);
  }

  if (themeConfig.navPosition) {
    handleNavPositionClick(themeConfig.navPosition);
  }

  if (themeConfig.navbarSize === 'small') {
    sidebarSmallClick({ preventDefault: () => {}, stopPropagation: () => {} });
  } else if (themeConfig.navbarSize === 'expand') {
    sidebarHoverClick();
  } else {
    handleNavbarSize();
  }

  if (typeof themeConfig.sidebarBackground === 'string') {
    if (themeConfig.sidebarBackground) {
      localStorage.setItem('navbackgroundImage', themeConfig.sidebarBackground);
    } else {
      localStorage.removeItem('navbackgroundImage');
    }
  }

  if (typeof themeConfig.mainBackground === 'string') {
    if (themeConfig.mainBackground) {
      localStorage.setItem('mainBackgroundImage', themeConfig.mainBackground);
    } else {
      localStorage.removeItem('mainBackgroundImage');
    }
    useMainContentCurrentBG();
  }

  if (typeof themeConfig.preloaderEnabled === 'boolean') {
    localStorage.setItem('preloaderEnabled', String(themeConfig.preloaderEnabled));

    // Do not leave the global loader permanently visible.
    // If enabled, briefly show it then auto-hide.
    if (themeConfig.preloaderEnabled) {
      preloader.value = true;
      window.setTimeout(() => {
        preloader.value = false;
      }, 650);
    } else {
      preloader.value = false;
    }
  }

  if (typeof themeConfig.hideThemeSidebar === 'boolean') {
    hideThemeSidebar.value = themeConfig.hideThemeSidebar;
    localStorage.setItem('hideThemeSidebar', String(themeConfig.hideThemeSidebar));
    if (themeConfig.hideThemeSidebar) {
      closeSidebar();
    }
  }
};

const isProtectedUiRoute = (routeLike = route) => {
  return Boolean(routeLike?.meta?.isPartials);
};

const syncRouteShellState = (routeLike = route) => {
  isPartials.value = Boolean(routeLike?.meta?.isPartials);
  layout.value = layouts[routeLike?.meta?.layout] || 'div';
};

const loadUserThemeSettings = async () => {
  if (!isProtectedUiRoute()) return;
  if (!isAdmin.value) return;

  try {
    const response = await fetch(`${API_BASE}/api/user-profile-settings`, {
      credentials: 'include',
    });
    if (!response.ok) return;

    const data = await response.json();
    const settings = data?.settings || {};
    const themeConfig = settings.themeConfig || {};
    applyThemeConfig(themeConfig);
  } catch (e) {
    // Non-blocking: app still works with localStorage defaults.
  }
};

const onThemeSettingsUpdated = (event) => {
  if (!isAdmin.value) return
  applyThemeConfig(event?.detail || {});
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
  if (isProtectedUiRoute()) {
    loadUserThemeSettings()
  }
  currentActiveTheme.value = syncThemePreference();
  applyBodyThemeClass(currentActiveTheme.value);

  if (layoutDirection.value === 'rtl') {
    setRtl();
  } else {
    setLtr();
  }

  if (selectedStyleSheet.value) {
      setStyleSheet(selectedStyleSheet.value);
    }
  useMainContentCurrentBG()
  window.addEventListener('ff-theme-settings-updated', onThemeSettingsUpdated)

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
  window.removeEventListener('ff-theme-settings-updated', onThemeSettingsUpdated)
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

watch(selectedStyleSheet, () => {
  setStyleSheet(selectedStyleSheet.value)
})

watch(currentActiveTheme, () => {
  currentActiveTheme.value = sanitizeTheme(currentActiveTheme.value);
  applyBodyThemeClass(currentActiveTheme.value);
})

watch(isAdmin, (nextIsAdmin) => {
  if (!nextIsAdmin) {
    closeSidebar()
  }
})

watch(isAdmin, (nextIsAdmin) => {
  if (!nextIsAdmin) {
    closeSidebar()
  }
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
    loadUserThemeSettings()
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
          :toggleSidebar="toggleSidebar"
          :canUseThemeSettings="isAdmin"
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

      <div v-if="isPartials && canShowThemeControls" class="right-sidebar-btn d-lg-block d-none">
        <button class="header-btn theme-settings-btn" @click="toggleSidebar"><i class="fa-light fa-gear"></i></button>
      </div>

      <!-- right sidebar start -->
      <RightSidebarComponent v-if="isPartials && canShowThemeControls"
        :isSidebarActive="isSidebarActive"
        :closeSidebar="closeSidebar"
        :isLightTheme="isLightTheme"
      />
      <!-- right sidebar end -->

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

body.wa-dashboard-active .right-sidebar-btn button {
  background: var(--wa-shell-surface-elevated) !important;
  color: var(--wa-shell-accent) !important;
  border: 1px solid var(--wa-shell-border) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3) !important;
}

body.wa-dashboard-active .right-sidebar-btn button:hover {
  background: color-mix(in srgb, var(--wa-shell-surface-elevated) 82%, var(--wa-shell-accent-soft) 18%) !important;
}

/* â”€â”€ WorkoutAtlas layout cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* Settings gear: pull 12px inward so it never covers the scrollbar */
.right-sidebar-btn {
  right: 12px !important;
}
.right-sidebar-btn button {
  border-radius: 6px !important;
}

/* Sidebar right border â€” separates sidebar from content area */
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

/* â”€â”€ Dark sidebar: override light-theme global rules â”€â”€â”€â”€â”€â”€â”€ */
/* style.css sets light-theme sidebar to #fff â€” cancel that */
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

/* Section header gradient variable â€” overridden to dark surface */
.main-sidebar .sidebar-link-group-title.sidebar-section-header {
  --ff-page-header-gradient: transparent !important;
  --ff-page-header-bg: rgba(255, 255, 255, 0.04) !important;
  background: rgba(255, 255, 255, 0.04) !important;
  background-image: none !important;
  color: var(--wa-shell-text-muted, #748094) !important;
}

/* Light-theme link colors â€” keep dark */
.light-theme .sidebar-item .sidebar-link .nav-icon,
.light-theme .sidebar-item .sidebar-dropdown-item .sidebar-link {
  color: var(--wa-shell-text-secondary, #a5afbd) !important;
}
.light-theme .sidebar-link-group-title {
  color: var(--wa-shell-text-muted, #748094) !important;
}
</style>

