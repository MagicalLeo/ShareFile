<script setup lang="ts">
const config = useRuntimeConfig()

interface FileInfo {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  downloadCount: number
  downloadLimit: number | null
  limitReached: boolean
  createdAt: string
}

const route = useRoute()
const fileId = route.params.id as string

const fileInfo = ref<FileInfo | null>(null)
const password = ref('')
const error = ref('')
const errorType = ref<'generic' | 'disabled' | 'limit' | null>(null)
const isLoading = ref(true)
const isDownloading = ref(false)
const hasUrlPassword = ref(false)

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Fetch file info on mount
onMounted(async () => {
  const urlPwd = route.query.pwd as string
  if (urlPwd) {
    password.value = urlPwd
    hasUrlPassword.value = true
  }

  try {
    const response = await fetch(`/api/files/${fileId}`)
    if (!response.ok) {
      const data = await response.json()
      if (response.status === 403) {
        if (data.message?.includes('disabled')) {
          errorType.value = 'disabled'
          error.value = 'This file has been disabled by the administrator.'
        } else {
          errorType.value = 'limit'
          error.value = 'Download limit reached. This file is no longer available.'
        }
      } else {
        error.value = 'File not found or link is invalid.'
      }
      return
    }
    const data = await response.json()
    if (data.limitReached) {
      errorType.value = 'limit'
      error.value = 'Download limit reached. This file is no longer available.'
      return
    }
    fileInfo.value = data
  } catch (err: any) {
    error.value = 'Failed to load file information'
  } finally {
    isLoading.value = false
  }
})

const handleDownload = async () => {
  if (!password.value) {
    error.value = 'Please enter the password'
    return
  }

  isDownloading.value = true
  error.value = ''

  try {
    const response = await fetch(`/api/download/${fileId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    })

    if (!response.ok) {
      const data = await response.json()
      if (response.status === 403) {
        if (data.message?.includes('disabled')) {
          errorType.value = 'disabled'
          error.value = 'This file has been disabled.'
        } else if (data.message?.includes('limit')) {
          errorType.value = 'limit'
          error.value = 'Download limit reached.'
        } else {
          error.value = data.message || 'Download failed'
        }
      } else {
        error.value = data.message || 'Invalid password'
      }
      hasUrlPassword.value = false
      return
    }

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = fileInfo.value?.fileName || 'download'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) filename = decodeURIComponent(match[1])
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    if (fileInfo.value) {
      fileInfo.value.downloadCount++
    }
  } catch (err: any) {
    error.value = 'Failed to download file'
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <div class="page-wrapper">
    <header class="page-header">
      <Icon name="lucide:share-2" size="24" class="logo-icon" />
      <h1>{{ config.public.appName }}</h1>
    </header>

    <main class="page-main">
      <div class="card">
        <!-- Loading -->
        <div v-if="isLoading" class="card-loading">
          <Icon name="lucide:loader-2" size="20" class="spinner" />
          <span>Loading...</span>
        </div>

        <!-- Error States -->
        <div v-else-if="errorType === 'disabled'" class="card-error">
          <Icon name="lucide:ban" size="28" class="error-icon" />
          <h2>File Disabled</h2>
          <p>This file has been disabled by the administrator and is no longer available for download.</p>
        </div>

        <div v-else-if="errorType === 'limit'" class="card-error">
          <Icon name="lucide:alert-octagon" size="28" class="error-icon" />
          <h2>Download Limit Reached</h2>
          <p>This file has reached its maximum download limit and is no longer available.</p>
        </div>

        <div v-else-if="!fileInfo && error" class="card-error">
          <Icon name="lucide:file-x" size="28" class="error-icon" />
          <h2>File Not Found</h2>
          <p>This file may have been removed or the link is invalid.</p>
        </div>

        <!-- File Ready -->
        <template v-else-if="fileInfo">
          <div class="file-info">
            <Icon name="lucide:file" size="24" class="file-icon" />
            <div class="file-details">
              <div class="file-name">{{ fileInfo.fileName }}</div>
              <div class="file-size">{{ formatFileSize(fileInfo.fileSize) }}</div>
            </div>
          </div>

          <div v-if="error" class="error-msg">
            <Icon name="lucide:alert-circle" size="14" />
            {{ error }}
          </div>

          <!-- Direct Download -->
          <template v-if="hasUrlPassword && !error">
            <button class="btn btn-primary btn-block" :disabled="isDownloading" @click="handleDownload">
              <template v-if="isDownloading">
                <Icon name="lucide:loader-2" size="18" class="spinner" />
                Downloading...
              </template>
              <template v-else>
                <Icon name="lucide:download" size="18" />
                Download Now
              </template>
            </button>
          </template>

          <!-- Password Form -->
          <template v-else>
            <div class="form-group">
              <label>
                <Icon name="lucide:lock" size="14" />
                Password
              </label>
              <input
                v-model="password"
                type="text"
                placeholder="Enter password"
                @keyup.enter="handleDownload"
              />
            </div>
            <button class="btn btn-primary btn-block" :disabled="!password || isDownloading" @click="handleDownload">
              <template v-if="isDownloading">
                <Icon name="lucide:loader-2" size="18" class="spinner" />
                Downloading...
              </template>
              <template v-else>
                <Icon name="lucide:download" size="18" />
                Download
              </template>
            </button>
          </template>
        </template>
      </div>
    </main>

    <footer class="page-footer">
      <p class="footer-copyright">&copy; {{ new Date().getFullYear() }} {{ config.public.appName }}</p>
    </footer>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.logo-icon {
  color: var(--color-primary);
}

.page-header h1 {
  font-size: var(--font-md);
  font-weight: 600;
  margin: 0;
}

.page-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
}

.card {
  width: 100%;
  max-width: 360px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.card-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) 0;
  color: var(--color-text-secondary);
}

.card-error {
  text-align: center;
  padding: var(--spacing-md) 0;
}

.card-error .error-icon {
  color: var(--color-error);
  margin-bottom: var(--spacing-sm);
}

.card-error h2 {
  font-size: var(--font-md);
  margin: 0 0 var(--spacing-xs) 0;
}

.card-error p {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.file-icon {
  color: var(--color-primary);
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: var(--font-sm);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-xs);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-secondary);
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-block {
  width: 100%;
}

.page-footer {
  text-align: center;
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.footer-copyright {
  font-size: 10px;
  color: var(--color-text-muted);
  margin: 0;
}
</style>
