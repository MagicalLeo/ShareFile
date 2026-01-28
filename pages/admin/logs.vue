<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

interface LogEntry {
  timestamp: string
  ip: string
  fileId: string
  fileName?: string
  action: 'attempt' | 'success' | 'failed' | 'blocked'
  reason?: string
  userAgent?: string
}

const route = useRoute()
const logs = ref<LogEntry[]>([])
const isLoading = ref(true)
const fileIdFilter = ref(route.query.fileId as string || '')
const autoRefresh = ref(true)

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const fetchLogs = async () => {
  try {
    const url = fileIdFilter.value
      ? `/api/admin/logs?fileId=${fileIdFilter.value}&limit=100`
      : '/api/admin/logs?limit=100'
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      logs.value = data.logs
    }
  } catch (error) {
    console.error('Failed to fetch logs:', error)
  } finally {
    isLoading.value = false
  }
}

const clearFilter = () => {
  fileIdFilter.value = ''
  navigateTo('/admin/logs')
  fetchLogs()
}

const getStatusClass = (action: string) => {
  switch (action) {
    case 'success': return 'status-success'
    case 'failed': return 'status-failed'
    case 'blocked': return 'status-blocked'
    default: return 'status-default'
  }
}

const getStatusIcon = (action: string) => {
  switch (action) {
    case 'success': return 'lucide:check'
    case 'failed': return 'lucide:x'
    case 'blocked': return 'lucide:shield-off'
    default: return 'lucide:minus'
  }
}

// Auto refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null

watch(autoRefresh, (enabled) => {
  if (enabled) {
    refreshInterval = setInterval(fetchLogs, 5000)
  } else if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}, { immediate: true })

onMounted(fetchLogs)

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
  <div class="logs-page">
    <header class="page-header">
      <div>
        <h1>Download Logs</h1>
        <p>Monitor all download attempts and activity</p>
      </div>
      <div class="header-actions">
        <label class="auto-refresh">
          <input type="checkbox" v-model="autoRefresh" />
          <span>Auto refresh</span>
        </label>
        <button class="btn btn-secondary" @click="fetchLogs">
          <Icon name="lucide:refresh-cw" size="18" />
          Refresh
        </button>
      </div>
    </header>

    <div v-if="fileIdFilter" class="filter-banner">
      <Icon name="lucide:filter" size="18" />
      <span>Showing logs for file: <strong>{{ fileIdFilter.slice(0, 8) }}...</strong></span>
      <button @click="clearFilter">
        <Icon name="lucide:x" size="16" />
        Clear filter
      </button>
    </div>

    <div class="logs-card">
      <div v-if="isLoading" class="loading-state">
        <Icon name="lucide:loader-2" size="24" class="spinner" />
        Loading...
      </div>

      <div v-else-if="logs.length === 0" class="empty-state">
        <Icon name="lucide:activity" size="48" />
        <h3>No activity yet</h3>
        <p>Download attempts will appear here</p>
      </div>

      <table v-else class="logs-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Status</th>
            <th>IP Address</th>
            <th>File</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, index) in logs" :key="index" :class="getStatusClass(log.action)">
            <td class="time-cell">{{ formatTimestamp(log.timestamp) }}</td>
            <td>
              <span class="status-badge" :class="log.action">
                <Icon :name="getStatusIcon(log.action)" size="14" />
                {{ log.action }}
              </span>
            </td>
            <td class="ip-cell">{{ log.ip }}</td>
            <td class="file-cell">
              <span v-if="log.fileName">{{ log.fileName }}</span>
              <span v-else class="file-id">{{ log.fileId.slice(0, 8) }}...</span>
            </td>
            <td class="details-cell">{{ log.reason || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.logs-page {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}

.page-header h1 {
  font-size: var(--font-xl);
  margin-bottom: var(--spacing-xs);
}

.page-header p {
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.auto-refresh input {
  cursor: pointer;
}

.filter-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(59, 130, 246, 0.1);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-sm);
}

.filter-banner button {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 8px;
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-sm);
}

.filter-banner button:hover {
  text-decoration: underline;
}

.logs-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  gap: var(--spacing-sm);
}

.empty-state h3 {
  color: var(--color-text);
  margin: 0;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th,
.logs-table td {
  padding: var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.logs-table th {
  font-weight: 500;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg);
}

.logs-table tbody tr.status-success {
  background: rgba(16, 185, 129, 0.02);
}

.logs-table tbody tr.status-failed {
  background: rgba(239, 68, 68, 0.02);
}

.logs-table tbody tr.status-blocked {
  background: rgba(239, 68, 68, 0.05);
}

.time-cell {
  font-family: monospace;
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--font-xs);
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-badge.failed {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.status-badge.blocked {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
}

.ip-cell {
  font-family: monospace;
  font-size: var(--font-sm);
}

.file-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-id {
  font-family: monospace;
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

.details-cell {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
