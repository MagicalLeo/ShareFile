<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({
  layout: 'admin'
})

interface UploadResult {
  id: string
  fileName: string
  fileSize: number
  downloadUrl: string
  downloadUrlWithPassword: string
  password: string
}

const file = ref<File | null>(null)
const qrCodeDataUrl = ref<string>('')
const password = ref('')
const downloadLimit = ref<string>('')
const isUploading = ref(false)
const uploadResult = ref<UploadResult | null>(null)
const error = ref('')
const copiedField = ref<string | null>(null)

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

onMounted(() => {
  password.value = generatePassword()
})

const refreshPassword = () => {
  password.value = generatePassword()
}

const handleFileSelected = (selectedFile: File) => {
  file.value = selectedFile
  error.value = ''
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleUpload = async () => {
  if (!file.value) {
    error.value = 'Please select a file'
    return
  }

  if (!password.value) {
    error.value = 'Please enter a password'
    return
  }

  isUploading.value = true
  error.value = ''

  try {
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('password', password.value)
    if (downloadLimit.value) {
      formData.append('downloadLimit', downloadLimit.value)
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Upload failed')
    }

    const data = await response.json()
    // Use the download domain from config or current host
    const downloadHost = useRuntimeConfig().public.downloadHost || window.location.origin
    data.downloadUrl = data.downloadUrl.replace(/https?:\/\/[^\/]+/, downloadHost)
    data.downloadUrlWithPassword = data.downloadUrlWithPassword.replace(/https?:\/\/[^\/]+/, downloadHost)
    uploadResult.value = data

    // Generate QR code
    try {
      qrCodeDataUrl.value = await QRCode.toDataURL(data.downloadUrlWithPassword, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1A1A1A',
          light: '#FFFFFF'
        }
      })
    } catch (qrErr) {
      console.error('QR code generation failed:', qrErr)
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to upload file'
  } finally {
    isUploading.value = false
  }
}

const copyToClipboard = async (text: string, field: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => {
      copiedField.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const resetForm = () => {
  file.value = null
  password.value = generatePassword()
  downloadLimit.value = ''
  uploadResult.value = null
  error.value = ''
  qrCodeDataUrl.value = ''
}
</script>

<template>
  <div class="upload-page">
    <header class="page-header">
      <h1>Upload File</h1>
      <p>Upload and share files securely with password protection</p>
    </header>

    <div class="upload-card">
      <!-- Upload Form -->
      <template v-if="!uploadResult">
        <FileUploader
          :file="file"
          @file-selected="handleFileSelected"
        />

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">
              <Icon name="lucide:lock" size="16" />
              Password
            </label>
            <PasswordInput
              v-model="password"
              :show-refresh="true"
              placeholder="Auto-generated"
              @refresh="refreshPassword"
            />
          </div>
          <div class="form-group" style="width: 120px;">
            <label class="form-label">
              <Icon name="lucide:hash" size="16" />
              Limit
            </label>
            <input
              v-model="downloadLimit"
              type="number"
              min="1"
              class="form-input"
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div v-if="error" class="message message-error">
          <Icon name="lucide:alert-circle" size="18" />
          {{ error }}
        </div>

        <button
          class="btn btn-primary btn-block"
          :disabled="!file || !password || isUploading"
          @click="handleUpload"
        >
          <template v-if="isUploading">
            <Icon name="lucide:loader-2" size="20" class="spinner" />
            Uploading...
          </template>
          <template v-else>
            <Icon name="lucide:upload" size="20" />
            Upload File
          </template>
        </button>
      </template>

      <!-- Success State -->
      <template v-else>
        <div class="success-header">
          <div class="success-icon">
            <Icon name="lucide:check" size="32" />
          </div>
          <h2>File Uploaded!</h2>
        </div>

        <div class="file-info">
          <Icon name="lucide:file" size="24" class="file-icon" />
          <div>
            <div class="file-name">{{ uploadResult.fileName }}</div>
            <div class="file-size">{{ formatFileSize(uploadResult.fileSize) }}</div>
          </div>
        </div>

        <div class="share-section">
          <label class="share-label">Share Link</label>
          <p class="share-hint">This link includes the password. Anyone with this link can download the file.</p>
          <div class="share-input">
            <input type="text" readonly :value="uploadResult.downloadUrlWithPassword" />
            <button @click="copyToClipboard(uploadResult.downloadUrlWithPassword, 'fullUrl')">
              <Icon :name="copiedField === 'fullUrl' ? 'lucide:check' : 'lucide:copy'" size="18" />
            </button>
          </div>
        </div>

        <div v-if="qrCodeDataUrl" class="qr-section">
          <label class="share-label">QR Code</label>
          <p class="share-hint">Scan to download (password included)</p>
          <div class="qr-code-container">
            <img :src="qrCodeDataUrl" alt="QR Code" class="qr-code" />
          </div>
        </div>

        <button class="btn btn-secondary btn-block" @click="resetForm">
          <Icon name="lucide:plus" size="20" />
          Upload Another
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.upload-page {
  max-width: 600px;
}

.page-header {
  margin-bottom: var(--spacing-lg);
}

.page-header h1 {
  font-size: var(--font-xl);
  margin-bottom: var(--spacing-xs);
}

.page-header p {
  color: var(--color-text-secondary);
}

.upload-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-top: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.form-row .form-group {
  margin: 0;
}

.flex-1 {
  flex: 1;
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-sm);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.message {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.message-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.success-header {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-success);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
}

.success-header h2 {
  font-size: var(--font-lg);
}

.file-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
}

.file-icon {
  color: var(--color-primary);
}

.file-name {
  font-weight: 500;
  word-break: break-all;
}

.file-size {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.share-section {
  margin-bottom: var(--spacing-lg);
}

.share-label {
  display: block;
  font-size: var(--font-sm);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-secondary);
}

.share-hint {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-sm);
}

.share-input {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.share-input input {
  flex: 1;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-family: monospace;
  background: var(--color-bg);
}

.share-input button {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.share-input button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-md) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-sm);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.qr-section {
  margin-bottom: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.qr-code-container {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md);
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.qr-code {
  width: 200px;
  height: 200px;
}
</style>
