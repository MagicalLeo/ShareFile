# ShareFile

A self-hosted, password-protected file sharing system. Simple, secure, and easy to deploy.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Nuxt](https://img.shields.io/badge/Nuxt-3-00DC82.svg)](https://nuxt.com/)

## Why ShareFile?

Most file sharing services are either:
- **Too complex** - Enterprise solutions with features you don't need
- **Not self-hosted** - Your files go through third-party servers
- **Lacking security** - No password protection or access control

ShareFile is different:
- **One-click deploy** - Just `npm install` and `npm run build`
- **Self-hosted** - Your files stay on your server
- **Secure by default** - Password protection, rate limiting, download limits
- **Dual-port architecture** - Separate upload (internal) and download (public) servers

## Features

**Core**
- Password-protected file uploads and downloads
- Auto-generated secure passwords
- Shareable download links with QR code (scan to download)
- File enable/disable toggle
- Download count limits
- Password reset for existing files

**Security**
- Passwords stored as bcrypt hashes (not plaintext)
- Rate limiting: 5 failed attempts = 15 minute lockout per IP+file
- Dual-port separation for upload/download servers
- Files stored with UUID names (original names hidden)
- Direct file access blocked

**Admin Dashboard**
- Upload/download statistics with charts
- File management (enable, disable, delete)
- Download logs with IP tracking
- File type distribution

## Quick Start

```bash
# Clone
git clone https://github.com/MagicalLeo/ShareFile.git
cd ShareFile

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your database credentials

# Setup database
psql -U postgres -c "CREATE DATABASE sharefile;"
psql -U postgres -d sharefile -f server/database/schema.sql

# Build and run
npm run build
node server.prod.js
```

Upload server: `http://localhost:8800/admin`
Download server: `http://localhost:8801/download/[id]`

## Configuration

```env
# Database
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sharefile

# Storage
UPLOAD_DIR=./uploads

# Branding (optional)
APP_NAME=ShareFile
DOWNLOAD_HOST=https://share.example.com
```

## Architecture

```
                    ┌─────────────────┐
                    │   Nuxt Server   │
                    │   (port 3333)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────┴─────────┐       ┌──────────┴──────────┐
    │   Upload Server   │       │   Download Server   │
    │    (port 8800)    │       │     (port 8801)     │
    │                   │       │                     │
    │  /admin/*         │       │  /download/*        │
    │  /api/upload      │       │  /api/download/*    │
    │  /api/admin/*     │       │  /api/files/*       │
    └───────────────────┘       └─────────────────────┘
           │                              │
      Internal/VPN                    Public
```

The dual-port design allows you to:
- Expose only the download server to the internet
- Keep the admin/upload server behind VPN or firewall
- Use different rate limits and security rules per server

## Production Deployment

### With Nginx (recommended)

```nginx
# Download server (public)
server {
    listen 80;
    server_name share.example.com;

    location / {
        proxy_pass http://127.0.0.1:8801;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Block admin routes
    location ~ ^/(admin|api/upload|api/admin) {
        return 403;
    }
}

# Upload server (internal/VPN only)
server {
    listen 443 ssl;
    server_name upload.example.com;

    # Restrict to VPN
    allow 10.8.0.0/24;
    deny all;

    location / {
        proxy_pass http://127.0.0.1:8800;
    }
}
```

### With Docker (coming soon)

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file (multipart/form-data) |
| GET | `/api/files/[id]` | Get file info |
| POST | `/api/download/[id]` | Download with password |
| GET | `/api/admin/files` | List all files |
| PATCH | `/api/admin/files/[id]` | Update file (enable/disable) |
| DELETE | `/api/admin/files/[id]` | Delete file |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/logs` | Download logs |

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3
- **Backend**: Nitro (Nuxt server engine)
- **Database**: PostgreSQL
- **Icons**: Lucide
- **Styling**: Custom CSS (no framework)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see [LICENSE](LICENSE) for details.
