<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

interface FileInfo {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  downloadCount: number
  downloadLimit: number | null
  isEnabled: boolean
  createdAt: string
}

const files = ref<FileInfo[]>([])
const isLoading = ref(true)
const deleteConfirm = ref<string | null>(null)
const copiedId = ref<string | null>(null)
const searchQuery = ref('')
const resetPasswordModal = ref<{ id: string, fileName: string } | null>(null)
const newPassword = ref<string | null>(null)
const isResettingPassword = ref(false)

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  const query = searchQuery.value.toLowerCase()
  return files.value.filter(f => f.fileName.toLowerCase().includes(query))
})

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchFiles = async () => {
  try {
    const response = await fetch('/api/admin/files')
    if (response.ok) {
      const data = await response.json()
      files.value = data.files
    }
  } catch (error) {
    console.error('Failed to fetch files:', error)
  } finally {
    isLoading.value = false
  }
}

const deleteFile = async (id: string) => {
  try {
    const response = await fetch(`/api/admin/files/${id}`, { method: 'DELETE' })
    if (response.ok) {
      files.value = files.value.filter(f => f.id !== id)
      deleteConfirm.value = null
    }
  } catch (error) {
    console.error('Failed to delete file:', error)
  }
}

const toggleEnabled = async (file: FileInfo) => {
  try {
    const response = await fetch(`/api/admin/files/${file.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !file.isEnabled })
    })
    if (response.ok) {
      file.isEnabled = !file.isEnabled
    }
  } catch (error) {
    console.error('Failed to toggle file:', error)
  }
}

const copyLink = async (file: FileInfo) => {
  const downloadHost = useRuntimeConfig().public.downloadHost || window.location.origin
  const url = `${downloadHost}/download/${file.id}`
  await navigator.clipboard.writeText(url)
  copiedId.value = file.id
  setTimeout(() => {
    copiedId.value = null
  }, 2000)
}

const getDownloadStatus = (file: FileInfo) => {
  if (file.downloadLimit === null) {
    return `${file.downloadCount}`
  }
  return `${file.downloadCount}/${file.downloadLimit}`
}

const isLimitReached = (file: FileInfo) => {
  return file.downloadLimit !== null && file.downloadCount >= file.downloadLimit
}

const generatePassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const allChars = uppercase + lowercase + numbers

  let result = ''
  result += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
  result += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
  result += numbers.charAt(Math.floor(Math.random() * numbers.length))

  for (let i = 0; i < 5; i++) {
    result += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }

  return result.split('').sort(() => Math.random() - 0.5).join('')
}

const openResetPasswordModal = (file: FileInfo) => {
  resetPasswordModal.value = { id: file.id, fileName: file.fileName }
  newPassword.value = null
}

const closeResetPasswordModal = () => {
  resetPasswordModal.value = null
  newPassword.value = null
}

const resetPassword = async () => {
  if (!resetPasswordModal.value) return

  isResettingPassword.value = true
  try {
    const generatedPassword = generatePassword()
    const response = await fetch(`/api/admin/files/${resetPasswordModal.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: generatedPassword })
    })

    if (response.ok) {
      const data = await response.json()
      newPassword.value = data.newPassword
    }
  } catch (error) {
    console.error('Failed to reset password:', error)
  } finally {
    isResettingPassword.value = false
  }
}

const copyNewPassword = async () => {
  if (newPassword.value) {
    await navigator.clipboard.writeText(newPassword.value)
  }
}

const copyNewLink = async () => {
  if (resetPasswordModal.value && newPassword.value) {
    const downloadHost = useRuntimeConfig().public.downloadHost || window.location.origin
    const link = `${downloadHost}/download/${resetPasswordModal.value.id}?pwd=${newPassword.value}`
    await navigator.clipboard.writeText(link)
  }
}

onMounted(fetchFiles)
</script>

<template>
  <div class="files-page">
    <header class="page-header">
      <div>
        <h1>Files</h1>
        <p>Manage uploaded files</p>
      </div>
      <NuxtLink to="/admin/upload" class="btn btn-primary btn-sm">
        <Icon name="lucide:upload" size="16" />
        Upload
      </NuxtLink>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <Icon name="lucide:search" size="16" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search files..."
        />
      </div>
      <div class="file-count">{{ filteredFiles.length }} files</div>
    </div>

    <div class="files-card">
      <div v-if="isLoading" class="loading-state">
        <Icon name="lucide:loader-2" size="20" class="spinner" />
        Loading...
      </div>

      <div v-else-if="files.length === 0" class="empty-state">
        <Icon name="lucide:folder-open" size="32" />
        <h3>No files yet</h3>
        <NuxtLink to="/admin/upload" class="btn btn-primary btn-sm">
          <Icon name="lucide:upload" size="16" />
          Upload File
        </NuxtLink>
      </div>

      <table v-else class="files-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Size</th>
            <th>Downloads</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in filteredFiles" :key="file.id" :class="{ disabled: !file.isEnabled }">
            <td>
              <div class="file-name-cell">
                <Icon name="lucide:file" size="16" class="file-icon" />
                <span class="file-name">{{ file.fileName }}</span>
              </div>
            </td>
            <td class="size-cell">{{ formatFileSize(file.fileSize) }}</td>
            <td>
              <span class="download-badge" :class="{ 'limit-reached': isLimitReached(file) }">
                {{ getDownloadStatus(file) }}
              </span>
            </td>
            <td>
              <button
                class="status-toggle"
                :class="{ enabled: file.isEnabled }"
                @click="toggleEnabled(file)"
                :title="file.isEnabled ? 'Click to disable' : 'Click to enable'"
              >
                <Icon :name="file.isEnabled ? 'lucide:check-circle' : 'lucide:x-circle'" size="16" />
                {{ file.isEnabled ? 'Active' : 'Disabled' }}
              </button>
            </td>
            <td class="date-cell">{{ formatDate(file.createdAt) }}</td>
            <td>
              <div class="actions-cell">
                <button
                  class="action-btn"
                  :class="{ copied: copiedId === file.id }"
                  :title="copiedId === file.id ? 'Copied!' : 'Copy Link'"
                  @click="copyLink(file)"
                >
                  <Icon :name="copiedId === file.id ? 'lucide:check' : 'lucide:link'" size="14" />
                </button>
                <button
                  class="action-btn"
                  title="Reset Password"
                  @click="openResetPasswordModal(file)"
                >
                  <Icon name="lucide:key" size="14" />
                </button>
                <NuxtLink
                  :to="`/admin/logs?fileId=${file.id}`"
                  class="action-btn"
                  title="View Logs"
                >
                  <Icon name="lucide:activity" size="14" />
                </NuxtLink>
                <button
                  v-if="deleteConfirm !== file.id"
                  class="action-btn danger"
                  title="Delete"
                  @click="deleteConfirm = file.id"
                >
                  <Icon name="lucide:trash-2" size="14" />
                </button>
                <button
                  v-else
                  class="action-btn danger-solid"
                  title="Confirm Delete"
                  @click="deleteFile(file.id)"
                >
                  <Icon name="lucide:check" size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Reset Password Modal -->
    <div v-if="resetPasswordModal" class="modal-overlay" @click.self="closeResetPasswordModal">
      <div class="modal">
        <div class="modal-header">
          <h3>Reset Password</h3>
          <button class="modal-close" @click="closeResetPasswordModal">
            <Icon name="lucide:x" size="20" />
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-file-name">{{ resetPasswordModal.fileName }}</p>

          <template v-if="!newPassword">
            <p class="modal-warning">
              <Icon name="lucide:alert-triangle" size="16" />
              This will generate a new password. The old password will no longer work.
            </p>
            <button
              class="btn btn-primary btn-block"
              :disabled="isResettingPassword"
              @click="resetPassword"
            >
              <template v-if="isResettingPassword">
                <Icon name="lucide:loader-2" size="18" class="spinner" />
                Resetting...
              </template>
              <template v-else>
                <Icon name="lucide:key" size="18" />
                Generate New Password
              </template>
            </button>
          </template>

          <template v-else>
            <div class="new-password-result">
              <Icon name="lucide:check-circle" size="24" class="success-icon" />
              <p>Password has been reset!</p>
            </div>
            <div class="result-item">
              <label>New Password</label>
              <div class="result-value">
                <code>{{ newPassword }}</code>
                <button @click="copyNewPassword" title="Copy Password">
                  <Icon name="lucide:copy" size="16" />
                </button>
              </div>
            </div>
            <div class="result-item">
              <label>New Link (with password)</label>
              <button class="btn btn-secondary btn-block btn-sm" @click="copyNewLink">
                <Icon name="lucide:link" size="16" />
                Copy Full Link
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.files-page {
  max-width: 1000px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.btn-sm {
  padding: 6px 12px;
  font-size: var(--font-xs);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: 200px;
}

.search-box input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  font-size: var(--font-xs);
}

.file-count {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

.files-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
  gap: var(--spacing-sm);
}

.empty-state h3 {
  color: var(--color-text);
  margin: 0;
  font-size: var(--font-sm);
}

.files-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-xs);
}

.files-table th,
.files-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.files-table th {
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg);
}

.files-table tbody tr:hover {
  background: var(--color-bg);
}

.files-table tbody tr.disabled {
  opacity: 0.5;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.file-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.size-cell {
  color: var(--color-text-secondary);
}

.download-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-bg);
  border-radius: 10px;
  font-size: 11px;
}

.download-badge.limit-reached {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.status-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.status-toggle.enabled {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.date-cell {
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.actions-cell {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.action-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-hover);
}

.action-btn.copied {
  color: var(--color-success);
  border-color: var(--color-success);
}

.action-btn.danger:hover {
  color: var(--color-error);
  border-color: var(--color-error);
}

.action-btn.danger-solid {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: var(--font-md);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 4px;
}

.modal-close:hover {
  color: var(--color-text);
}

.modal-body {
  padding: var(--spacing-md);
}

.modal-file-name {
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  word-break: break-all;
}

.modal-warning {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  margin-bottom: var(--spacing-md);
}

.new-password-result {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.new-password-result .success-icon {
  color: var(--color-success);
  margin-bottom: var(--spacing-xs);
}

.new-password-result p {
  color: var(--color-text);
  font-weight: 500;
}

.result-item {
  margin-bottom: var(--spacing-md);
}

.result-item label {
  display: block;
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.result-value {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.result-value code {
  flex: 1;
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: var(--font-md);
}

.result-value button {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
}

.result-value button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-sm {
  padding: 8px 12px;
  font-size: var(--font-sm);
}
</style>
