import { createError, readMultipartFormData } from 'h3'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const uploadDir = config.uploadDir as string

  // Ensure upload directory exists
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  // Parse multipart form data
  const formData = await readMultipartFormData(event)

  if (!formData) {
    throw createError({
      statusCode: 400,
      message: 'No form data provided'
    })
  }

  // Find file, password, and download limit fields
  let file: { filename?: string; data: Buffer; type?: string } | null = null
  let password: string | null = null
  let downloadLimit: number | null = null

  for (const field of formData) {
    if (field.name === 'file' && field.filename) {
      file = {
        filename: field.filename,
        data: field.data,
        type: field.type
      }
    } else if (field.name === 'password') {
      password = field.data.toString('utf-8')
    } else if (field.name === 'downloadLimit') {
      const limit = parseInt(field.data.toString('utf-8'), 10)
      if (!isNaN(limit) && limit > 0) {
        downloadLimit = limit
      }
    }
  }

  if (!file) {
    throw createError({
      statusCode: 400,
      message: 'No file provided'
    })
  }

  if (!password) {
    throw createError({
      statusCode: 400,
      message: 'No password provided'
    })
  }

  // Generate stored filename with UUID
  const storedName = `${uuidv4()}-${Date.now()}`
  const storedPath = join(uploadDir, storedName)

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    // Write file to disk
    await writeFile(storedPath, file.data)

    // Insert record into database (password stored as hash only for security)
    const result = await query(
      `INSERT INTO files (original_name, stored_name, password_hash, file_size, mime_type, download_limit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, original_name, file_size, created_at, download_limit`,
      [file.filename, storedName, passwordHash, file.data.length, file.type || 'application/octet-stream', downloadLimit]
    )

    const record = result.rows[0]

    // Generate download URL
    const baseUrl = getRequestURL(event)
    const downloadUrl = `${baseUrl.protocol}//${baseUrl.host}/download/${record.id}`
    const downloadUrlWithPassword = `${downloadUrl}?pwd=${encodeURIComponent(password)}`

    return {
      success: true,
      id: record.id,
      fileName: record.original_name,
      fileSize: record.file_size,
      downloadUrl,
      downloadUrlWithPassword,
      password
    }
  } catch (error) {
    console.error('Upload error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to upload file'
    })
  }
})
