// Custom dual-port server for ShareFile
// Upload server: 8800
// Download server: 8801

import http from 'http'
import httpProxy from 'http-proxy'
import { spawn } from 'child_process'

const UPLOAD_PORT = 8800
const DOWNLOAD_PORT = 8801
const NUXT_PORT = 3333 // Internal Nuxt port

// Create proxy
const proxy = httpProxy.createProxyServer({
  target: `http://localhost:${NUXT_PORT}`,
  ws: true
})

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err)
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Bad Gateway')
  }
})

// Upload server (17710) - only serves /admin/*, /api/upload, and static assets
const uploadServer = http.createServer((req, res) => {
  const url = req.url || ''

  // Allow admin pages, upload API, admin API, and assets
  if (
    url === '/' ||
    url.startsWith('/admin') ||
    url.startsWith('/api/upload') ||
    url.startsWith('/api/admin') ||
    url.startsWith('/_nuxt') ||
    url.startsWith('/__nuxt') ||
    url.startsWith('/@') ||
    url.startsWith('/node_modules')
  ) {
    proxy.web(req, res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found - This is the upload server (port 8800)')
  }
})

uploadServer.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head)
})

// Download server (17711) - only serves /download/*, /api/files/*, /api/download/*
const downloadServer = http.createServer((req, res) => {
  const url = req.url || ''

  // Allow download pages, file info API, download API, and assets
  if (
    url === '/' ||
    url.startsWith('/download') ||
    url.startsWith('/api/files') ||
    url.startsWith('/api/download') ||
    url.startsWith('/_nuxt') ||
    url.startsWith('/__nuxt') ||
    url.startsWith('/@') ||
    url.startsWith('/node_modules')
  ) {
    proxy.web(req, res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found - This is the download server (port 8801)')
  }
})

downloadServer.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head)
})

// Start Nuxt dev server on internal port
console.log('Starting Nuxt dev server...')
const nuxt = spawn('npx', ['nuxt', 'dev', '--port', NUXT_PORT.toString()], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NUXT_PORT: NUXT_PORT.toString() }
})

nuxt.stdout.on('data', (data) => {
  const output = data.toString()
  if (output.includes('Local:')) {
    // Nuxt is ready, start our servers
    uploadServer.listen(UPLOAD_PORT, () => {
      console.log(`\n✓ Upload server ready: http://localhost:${UPLOAD_PORT}/admin/upload`)
    })

    downloadServer.listen(DOWNLOAD_PORT, () => {
      console.log(`✓ Download server ready: http://localhost:${DOWNLOAD_PORT}/download/[id]`)
      console.log('\n')
    })
  }
  process.stdout.write(output)
})

nuxt.stderr.on('data', (data) => {
  process.stderr.write(data.toString())
})

nuxt.on('close', (code) => {
  console.log(`Nuxt process exited with code ${code}`)
  process.exit(code || 0)
})

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  nuxt.kill()
  uploadServer.close()
  downloadServer.close()
  process.exit(0)
})
