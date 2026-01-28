# ShareFile

A secure file sharing system built with Nuxt 3 and PostgreSQL.

## Features

- Upload files with password protection
- Generate shareable download links
- Password-protected downloads
- Direct file access is blocked (security)
- Clean, modern UI with Lucide icons

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your database:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
DB_HOST=127.0.0.1
DB_PORT=54321
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=sharefile
```

### 3. Setup Database

Create the database and tables:

```bash
# Set your database password
export DB_PASSWORD=your_password_here

# Run the setup script
./scripts/setup-db.sh
```

Or manually:

```bash
# Create database
psql -h 127.0.0.1 -p 54321 -U postgres -c "CREATE DATABASE sharefile;"

# Create tables
psql -h 127.0.0.1 -p 54321 -U postgres -d sharefile -f server/database/schema.sql
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### Upload Files

1. Navigate to `/admin/upload`
2. Drag and drop a file or click to browse
3. A password is auto-generated (you can refresh or edit it)
4. Click "Upload File"
5. Copy the share link (with or without embedded password)

### Download Files

1. Open the download link
2. If the URL includes the password (`?pwd=xxx`), click "Download Now"
3. Otherwise, enter the password and click "Download"

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload a file (multipart/form-data) |
| GET | `/api/files/[id]` | Get file information |
| POST | `/api/download/[id]` | Download with password in body |
| GET | `/api/download/[id]?pwd=xxx` | Download with password in URL |

## Project Structure

```
ShareFile/
├── nuxt.config.ts          # Nuxt configuration
├── package.json            # Dependencies
├── server/
│   ├── api/
│   │   ├── upload.post.ts        # Upload API
│   │   ├── files/[id].get.ts     # File info API
│   │   └── download/[id].*.ts    # Download APIs
│   ├── utils/db.ts               # Database connection
│   └── database/schema.sql       # Database schema
├── pages/
│   ├── admin/upload.vue          # Upload page
│   └── download/[id].vue         # Download page
├── components/
│   ├── FileUploader.vue          # File upload component
│   └── PasswordInput.vue         # Password input component
├── assets/css/main.css           # Global styles
└── uploads/                      # File storage (gitignored)
```

## Security

- Files are stored with UUID names (original names not exposed)
- Passwords are hashed with bcrypt
- The `/uploads` directory is not publicly accessible
- Direct file URL access returns 404
- All downloads require password verification
