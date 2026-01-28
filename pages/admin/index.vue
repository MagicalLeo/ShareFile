<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

interface Stats {
  overview: {
    totalFiles: number
    totalDownloads: number
    totalSize: number
    activeFiles: number
    disabledFiles: number
  }
  charts: {
    dailyDownloads: Array<{ date: string; label: string; downloads: number }>
    dailyUploads: Array<{ date: string; label: string; uploads: number }>
    fileTypes: Array<{ type: string; count: number; size: number }>
    successRate: number
    totalAttempts: number
  }
  topFiles: Array<{ id: string; fileName: string; downloads: number; size: number }>
}

const stats = ref<Stats | null>(null)
const isLoading = ref(true)

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const maxDownloads = computed(() => {
  if (!stats.value) return 1
  return Math.max(...stats.value.charts.dailyDownloads.map(d => d.downloads), 1)
})

const maxUploads = computed(() => {
  if (!stats.value) return 1
  return Math.max(...stats.value.charts.dailyUploads.map(d => d.uploads), 1)
})

const totalTypeCount = computed(() => {
  if (!stats.value) return 1
  return stats.value.charts.fileTypes.reduce((sum, t) => sum + t.count, 0) || 1
})

const typeColors: Record<string, string> = {
  'Images': '#3B82F6',
  'Videos': '#8B5CF6',
  'Audio': '#EC4899',
  'PDF': '#EF4444',
  'Archives': '#F59E0B',
  'Text': '#10B981',
  'Other': '#6B7280'
}

onMounted(async () => {
  try {
    const response = await fetch('/api/admin/stats')
    if (response.ok) {
      stats.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <header class="page-header">
      <h1>Dashboard</h1>
      <p>Overview of your file sharing activity</p>
    </header>

    <div v-if="isLoading" class="loading-state">
      <Icon name="lucide:loader-2" size="24" class="spinner" />
      Loading...
    </div>

    <template v-else-if="stats">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <Icon name="lucide:folder" size="22" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.overview.totalFiles }}</div>
            <div class="stat-label">Total Files</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">
            <Icon name="lucide:download" size="22" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.overview.totalDownloads }}</div>
            <div class="stat-label">Total Downloads</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple">
            <Icon name="lucide:hard-drive" size="22" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatFileSize(stats.overview.totalSize) }}</div>
            <div class="stat-label">Storage Used</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" :class="stats.charts.successRate >= 80 ? 'green' : 'orange'">
            <Icon name="lucide:percent" size="22" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.charts.successRate }}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-grid">
        <!-- Downloads Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Downloads (Last 7 Days)</h3>
            <span class="chart-total">{{ stats.charts.dailyDownloads.reduce((s, d) => s + d.downloads, 0) }} total</span>
          </div>
          <div class="bar-chart">
            <div
              v-for="day in stats.charts.dailyDownloads"
              :key="day.date"
              class="bar-item"
            >
              <div class="bar-container">
                <div
                  class="bar blue"
                  :style="{ height: `${(day.downloads / maxDownloads) * 100}%` }"
                >
                  <span v-if="day.downloads > 0" class="bar-value">{{ day.downloads }}</span>
                </div>
              </div>
              <div class="bar-label">{{ day.label }}</div>
            </div>
          </div>
        </div>

        <!-- Uploads Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Uploads (Last 7 Days)</h3>
            <span class="chart-total">{{ stats.charts.dailyUploads.reduce((s, d) => s + d.uploads, 0) }} total</span>
          </div>
          <div class="bar-chart">
            <div
              v-for="day in stats.charts.dailyUploads"
              :key="day.date"
              class="bar-item"
            >
              <div class="bar-container">
                <div
                  class="bar green"
                  :style="{ height: `${(day.uploads / maxUploads) * 100}%` }"
                >
                  <span v-if="day.uploads > 0" class="bar-value">{{ day.uploads }}</span>
                </div>
              </div>
              <div class="bar-label">{{ day.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Second Row -->
      <div class="content-grid">
        <!-- File Types -->
        <div class="card">
          <div class="card-header">
            <h2>File Types</h2>
          </div>
          <div class="card-body">
            <div v-if="stats.charts.fileTypes.length === 0" class="empty">No files yet</div>
            <div v-else class="types-list">
              <div
                v-for="type in stats.charts.fileTypes"
                :key="type.type"
                class="type-item"
              >
                <div class="type-info">
                  <span class="type-dot" :style="{ background: typeColors[type.type] || '#6B7280' }"></span>
                  <span class="type-name">{{ type.type }}</span>
                  <span class="type-count">{{ type.count }}</span>
                </div>
                <div class="type-bar-bg">
                  <div
                    class="type-bar"
                    :style="{
                      width: `${(type.count / totalTypeCount) * 100}%`,
                      background: typeColors[type.type] || '#6B7280'
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Files -->
        <div class="card">
          <div class="card-header">
            <h2>Top Downloads</h2>
            <NuxtLink to="/admin/files" class="view-all">View All</NuxtLink>
          </div>
          <div class="card-body">
            <div v-if="stats.topFiles.length === 0" class="empty">No downloads yet</div>
            <div v-else class="list">
              <div v-for="(file, index) in stats.topFiles" :key="file.id" class="list-item">
                <div class="rank" :class="{ gold: index === 0, silver: index === 1, bronze: index === 2 }">
                  {{ index + 1 }}
                </div>
                <div class="item-info">
                  <div class="item-name">{{ file.fileName }}</div>
                  <div class="item-meta">{{ formatFileSize(file.size) }}</div>
                </div>
                <div class="download-count">
                  <Icon name="lucide:download" size="14" />
                  {{ file.downloads }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Overview -->
      <div class="status-grid">
        <div class="status-card">
          <div class="status-ring">
            <svg viewBox="0 0 36 36" class="ring-svg">
              <path
                class="ring-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="ring-fill green"
                :stroke-dasharray="`${stats.charts.successRate}, 100`"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div class="ring-value">{{ stats.charts.successRate }}%</div>
          </div>
          <div class="status-info">
            <div class="status-title">Download Success Rate</div>
            <div class="status-desc">{{ stats.charts.totalAttempts }} attempts in last 30 days</div>
          </div>
        </div>

        <div class="status-card">
          <div class="status-ring">
            <svg viewBox="0 0 36 36" class="ring-svg">
              <path
                class="ring-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="ring-fill blue"
                :stroke-dasharray="`${stats.overview.totalFiles > 0 ? (stats.overview.activeFiles / stats.overview.totalFiles) * 100 : 100}, 100`"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div class="ring-value">{{ stats.overview.activeFiles }}</div>
          </div>
          <div class="status-info">
            <div class="status-title">Active Files</div>
            <div class="status-desc">{{ stats.overview.disabledFiles }} disabled</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1000px;
}

.page-header {
  margin-bottom: var(--spacing-md);
}

.page-header h1 {
  font-size: var(--font-lg);
  margin-bottom: 2px;
}

.page-header p {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stat-icon.blue { background: var(--color-primary); }
.stat-icon.green { background: var(--color-success); }
.stat-icon.purple { background: #8B5CF6; }
.stat-icon.orange { background: #F59E0B; }

.stat-value {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--color-text);
}

.stat-label {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.chart-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.chart-header h3 {
  font-size: var(--font-sm);
  font-weight: 600;
}

.chart-total {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  max-width: 32px;
  min-height: 4px;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: height 0.3s ease;
}

.bar.blue { background: var(--color-primary); }
.bar.green { background: var(--color-success); }

.bar-value {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.bar-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  margin-top: 6px;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.card-header h2 {
  font-size: var(--font-sm);
  font-weight: 600;
}

.view-all {
  font-size: var(--font-xs);
  color: var(--color-primary);
  text-decoration: none;
}

.card-body {
  padding: var(--spacing-sm) var(--spacing-md);
}

.empty {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--font-sm);
}

/* Types List */
.types-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-xs);
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.type-name {
  flex: 1;
}

.type-count {
  color: var(--color-text-secondary);
}

.type-bar-bg {
  height: 4px;
  background: var(--color-bg);
  border-radius: 2px;
  overflow: hidden;
}

.type-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* List */
.list {
  display: flex;
  flex-direction: column;
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.list-item:last-child {
  border-bottom: none;
}

.rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.rank.gold { background: #FEF3C7; color: #D97706; }
.rank.silver { background: #F3F4F6; color: #6B7280; }
.rank.bronze { background: #FED7AA; color: #C2410C; }

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--font-xs);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 10px;
  color: var(--color-text-secondary);
}

.download-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

/* Status Grid */
.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.status-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.status-ring {
  position: relative;
  width: 60px;
  height: 60px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--color-bg);
  stroke-width: 3;
}

.ring-fill {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.ring-fill.green { stroke: var(--color-success); }
.ring-fill.blue { stroke: var(--color-primary); }

.ring-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--font-sm);
  font-weight: 600;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: var(--font-sm);
  font-weight: 500;
}

.status-desc {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

/* Responsive */
@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid,
  .charts-grid,
  .content-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
