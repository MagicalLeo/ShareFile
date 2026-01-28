<script setup lang="ts">
// Check if we're on the download server (based on config or port)
const config = useRuntimeConfig()
const isDownloadServer = computed(() => {
  if (process.client) {
    // Check if downloadHost is configured, or if we're on port 8801
    const downloadHost = config.public.downloadHost
    if (downloadHost) {
      return window.location.origin === downloadHost
    }
    // Default: check if port is 8801 (download server)
    return window.location.port === '8801'
  }
  return false
})
</script>

<template>
  <div class="page-container">
    <div class="card">
      <div class="card-header">
        <h1>ShareFile</h1>
        <p>Secure File Sharing</p>
      </div>

      <div v-if="isDownloadServer" class="message">
        <Icon name="lucide:link" size="48" style="color: var(--color-text-muted); margin-bottom: 16px;" />
        <p style="font-size: var(--font-lg); color: var(--color-text);">
          You need a download link to access files.
        </p>
        <p style="margin-top: 8px;">
          The link format is:<br>
          <code style="background: var(--color-bg); padding: 4px 8px; border-radius: 4px;">
            [your-domain]/download/[file-id]
          </code>
        </p>
      </div>

      <div v-else style="text-align: center;">
        <NuxtLink to="/admin/upload" class="btn btn-primary">
          <Icon name="lucide:upload" size="20" />
          Go to Upload
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  text-align: center;
  padding: var(--spacing-lg) 0;
}

code {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: var(--font-sm);
}
</style>
