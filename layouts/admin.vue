<script setup lang="ts">
const route = useRoute()

const navItems = [
  { path: '/admin', icon: 'lucide:layout-dashboard', label: 'Dashboard' },
  { path: '/admin/upload', icon: 'lucide:upload', label: 'Upload' },
  { path: '/admin/files', icon: 'lucide:folder', label: 'Files' },
  { path: '/admin/logs', icon: 'lucide:activity', label: 'Logs' },
]

const isActive = (path: string) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <img src="/logo.png" alt="Codebat" class="logo-img" />
          <span class="logo-text">ShareFile</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <Icon :name="item.icon" size="20" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-info">
          <div class="footer-copyright">&copy; {{ new Date().getFullYear() }} Codebat Technologies</div>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}

.sidebar {
  width: 240px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-img {
  height: 32px;
}

.logo-text {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--color-text);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.nav-item.active {
  background: var(--color-primary);
  color: white;
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.footer-info {
  text-align: center;
}

.footer-warning {
  font-size: 10px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.footer-copyright {
  font-size: 9px;
  color: var(--color-text-muted);
  margin-top: var(--spacing-xs);
}

.main-content {
  flex: 1;
  margin-left: 240px;
  padding: var(--spacing-lg);
  min-height: 100vh;
}

@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  .sidebar-header h1 span,
  .nav-item span,
  .sidebar-footer span {
    display: none;
  }

  .logo {
    justify-content: center;
  }

  .nav-item {
    justify-content: center;
    padding: var(--spacing-sm);
  }

  .main-content {
    margin-left: 60px;
  }
}
</style>
