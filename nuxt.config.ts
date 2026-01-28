// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  app: {
    head: {
      title: 'Codebat ShareFile',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
      ]
    }
  },

  modules: [
    '@nuxt/icon'
  ],

  // Bundle icons at build time (no runtime API calls needed)
  icon: {
    serverBundle: 'local',
    clientBundle: {
      scan: true,
      sizeLimitKb: 256
    }
  },

  css: [
    '~/assets/css/main.css'
  ],

  runtimeConfig: {
    // Database configuration
    dbHost: process.env.DB_HOST || '127.0.0.1',
    dbPort: process.env.DB_PORT || '54321',
    dbUser: process.env.DB_USER || 'postgres',
    dbPassword: process.env.DB_PASSWORD || '',
    dbName: process.env.DB_NAME || 'sharefile',

    // Upload configuration
    uploadDir: process.env.UPLOAD_DIR || './uploads',

    // Public runtime config (exposed to client)
    public: {
      appName: 'ShareFile'
    }
  },

  // Disable serving static files from uploads directory
  nitro: {
    publicAssets: [
      {
        baseURL: '/assets',
        dir: 'public/assets'
      }
    ]
  },

  // Allow external hosts (for Cloudflare proxy)
  vite: {
    server: {
      allowedHosts: ['share.codebat.ai', 'upload.codebat.ai', 'localhost']
    }
  }
})
