<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { API_BASE } from '@/config/env'

const router = useRouter()

const loading = ref(false)
const errorMessage = ref('')
const notifications = ref([])
const activeFilter = ref('all')

const unreadCount = computed(() => notifications.value.filter((item) => !item.isRead).length)
const filteredNotifications = computed(() => {
  if (activeFilter.value === 'unread') {
    return notifications.value.filter((item) => !item.isRead)
  }
  return notifications.value
})

const fetchNotifications = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${API_BASE}/api/notifications?limit=100`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to load notifications.')
    }

    const data = await response.json()
    notifications.value = Array.isArray(data?.items) ? data.items : []
  } catch (error) {
    errorMessage.value = error?.message || 'Failed to load notifications.'
  } finally {
    loading.value = false
  }
}

const markAsRead = async (notificationId) => {
  try {
    const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to mark notification as read.')
    }

    notifications.value = notifications.value.map((item) =>
      item.id === notificationId
        ? {
            ...item,
            isRead: true,
            readAt: item.readAt || new Date().toISOString(),
          }
        : item
    )
  } catch {
    // Silent fail; user can retry.
  }
}

const markAllAsRead = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
      method: 'PATCH',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to mark all as read.')
    }

    const now = new Date().toISOString()
    notifications.value = notifications.value.map((item) => ({
      ...item,
      isRead: true,
      readAt: item.readAt || now,
    }))
  } catch {
    // Silent fail; user can retry.
  }
}

const openNotification = async (notification) => {
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }

  if (!notification.actionUrl) return

  if (/^https?:\/\//i.test(notification.actionUrl)) {
    window.open(notification.actionUrl, '_blank')
    return
  }

  router.push(notification.actionUrl)
}

const formatDateTime = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

onMounted(fetchNotifications)
</script>

<template>
  <div class="notifications-page">
    <div class="dashboard-breadcrumb ff-page-header mb-25">
      <h2>Notifications</h2>
      <div class="dashboard-filter d-flex align-items-center gap-2">
        <span class="header-meta">Unread: {{ unreadCount }}</span>
        <button type="button" class="btn btn-sm mark-all-btn" @click="markAllAsRead" :disabled="unreadCount === 0">
          Mark all read
        </button>
      </div>
    </div>

    <section class="panel panel-bg notifications-panel">
      <div class="panel-header notifications-head">
        <div class="filter-group">
          <button type="button" class="btn btn-sm filter-btn" :class="activeFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'" @click="activeFilter = 'all'">
            All
          </button>
          <button type="button" class="btn btn-sm filter-btn" :class="activeFilter === 'unread' ? 'btn-primary' : 'btn-outline-primary'" @click="activeFilter = 'unread'">
            Unread
          </button>
        </div>

        <button type="button" class="btn btn-sm refresh-btn" @click="fetchNotifications" :disabled="loading">
          Refresh
        </button>
      </div>

      <div class="panel-body">
        <p v-if="loading" class="state-message">Loading notifications...</p>
        <p v-else-if="errorMessage" class="state-message text-danger">{{ errorMessage }}</p>
        <p v-else-if="filteredNotifications.length === 0" class="state-message">No notifications found.</p>

        <ul v-else class="notifications-list">
          <li
            v-for="item in filteredNotifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.isRead, clickable: !!item.actionUrl }"
            @click="openNotification(item)"
          >
            <div class="notification-title-row">
              <h5>{{ item.title }}</h5>
              <span v-if="!item.isRead" class="badge bg-primary">New</span>
            </div>
            <p class="notification-message">{{ item.message }}</p>
            <div class="notification-meta">
              <span class="type-pill">{{ item.type }}</span>
              <span>{{ formatDateTime(item.createdAt) }}</span>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.notifications-page {
  display: grid;
  gap: 10px;
  padding-bottom: 6px;
  overflow-x: hidden;
}

.notifications-page .ff-page-header {
  margin-bottom: 0 !important;
  background: #1b2444;
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 14px;
  padding: 12px;
}

.notifications-page .ff-page-header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.15rem;
}

.header-meta {
  color: #cbd5e1;
  font-size: 0.82rem;
  font-weight: 600;
}

.notifications-panel {
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 14px;
  background: #1b2444 !important;
}

.notifications-panel :deep(.panel-header) {
  border-bottom: 1px solid rgba(96, 165, 250, 0.25);
}

.notifications-panel :deep(.panel-body) {
  padding: 10px;
}

.notifications-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 8px;
}

.mark-all-btn,
.filter-btn,
.refresh-btn {
  min-height: 32px;
  border-radius: 999px;
  padding: 0 12px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.mark-all-btn {
  border: 1px solid rgba(96, 165, 250, 0.35);
  background: #273142;
  color: #93c5fd;
}

.mark-all-btn:hover:not(:disabled) {
  background: #23304a;
  color: #dbeafe;
}

.mark-all-btn:disabled {
  opacity: 0.55;
}

.filter-btn.btn-primary {
  border-color: #3b82f6 !important;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%) !important;
  color: #f8fafc !important;
}

.filter-btn.btn-outline-primary {
  border-color: rgba(96, 165, 250, 0.35) !important;
  background: #273142 !important;
  color: #cbd5e1 !important;
}

.filter-btn.btn-outline-primary:hover,
.filter-btn.btn-outline-primary:focus-visible {
  border-color: #3b82f6;
  color: #f8fafc;
  background: #2c3a52;
}

.refresh-btn {
  border: 1px solid rgba(96, 165, 250, 0.35);
  background: #273142 !important;
  color: #cbd5e1 !important;
}

.refresh-btn:hover,
.refresh-btn:focus-visible {
  border-color: #3b82f6;
  color: #f8fafc;
  background: #2c3a52;
}

.state-message {
  margin: 0;
  padding: 12px;
  border: 1px dashed rgba(96, 165, 250, 0.25);
  border-radius: 10px;
  color: #f8fafc;
  background: #273142;
}

.notifications-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.notification-item {
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 10px;
  padding: 12px;
  background: #273142;
}

.notification-item.unread {
  border-left: 4px solid #3b82f6;
}

.notification-item.clickable {
  cursor: pointer;
}

.notification-item.clickable:hover {
  background: #2c3a52;
}

.notification-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.notification-title-row h5 {
  margin: 0;
  color: #f8fafc;
}

.notification-message {
  margin: 6px 0;
  color: #cbd5e1;
}

.notification-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #cbd5e1;
  font-size: 0.82rem;
  flex-wrap: wrap;
}

.type-pill {
  text-transform: capitalize;
  font-weight: 700;
  color: #93c5fd;
}

@media (max-width: 600px) {
  .notifications-page {
    gap: 8px;
  }

  .notifications-page .ff-page-header {
    padding: 10px;
  }

  .notifications-page .ff-page-header h2 {
    font-size: 1.05rem;
  }

  .notifications-page .dashboard-filter {
    width: 100%;
    justify-content: space-between;
    gap: 8px;
  }

  .notifications-head {
    flex-wrap: nowrap;
    align-items: center;
  }

  .filter-group {
    gap: 6px;
    min-width: 0;
  }

  .mark-all-btn,
  .filter-btn,
  .refresh-btn {
    min-height: 30px;
    padding: 0 11px;
    font-size: 0.72rem;
  }

  .refresh-btn {
    flex-shrink: 0;
  }

  .notifications-panel :deep(.panel-header) {
    padding: 10px;
  }

  .notifications-panel :deep(.panel-body) {
    padding: 8px;
  }
}
</style>
