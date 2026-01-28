<script setup lang="ts">
const emit = defineEmits<{
  (e: 'file-selected', file: File): void
}>()

const props = defineProps<{
  file: File | null
}>()

const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    emit('file-selected', files[0])
  }
}

const handleClick = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    emit('file-selected', files[0])
  }
}
</script>

<template>
  <div>
    <div
      class="dropzone"
      :class="{ active: isDragging, 'has-file': file }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="handleClick"
    >
      <input
        ref="fileInputRef"
        type="file"
        style="display: none"
        @change="handleFileChange"
      />

      <template v-if="!file">
        <div class="dropzone-icon">
          <Icon name="lucide:upload" size="48" />
        </div>
        <div class="dropzone-text">Drop your file here</div>
        <div class="dropzone-hint">or click to browse</div>
      </template>

      <template v-else>
        <div class="dropzone-icon" style="color: var(--color-success)">
          <Icon name="lucide:check" size="48" />
        </div>
        <div class="dropzone-text">{{ file.name }}</div>
        <div class="dropzone-hint">{{ formatFileSize(file.size) }}</div>
      </template>
    </div>
  </div>
</template>
