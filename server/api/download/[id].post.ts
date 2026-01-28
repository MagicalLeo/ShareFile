import { createError, sendStream, setHeaders, getHeader } from 'h3'
import { createReadStream, existsSync } from 'fs'
import { join } from 'path'
import bcrypt from 'bcrypt'
import { query } from '../../utils/db'
import { isRateLimited, recordFailedAttempt, clearRateLimit } from '../../utils/rateLimiter'
import { logDownloadAttempt, formatLogForConsole } from '../../utils/logger'

// Get client IP address
function getClientIP(event: any): string {
  return (
    getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket?.remoteAddress ||
    'unknown'
  )
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const uploadDir = config.uploadDir as string
  const id = getRouterParam(event, 'id')
  const ip = getClientIP(event)
  const userAgent = getHeader(event, 'user-agent')

  // Validate ID format first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request'
    })
  }

  // Check rate limit (per IP + fileId combination)
  const rateLimitCheck = isRateLimited(ip, id)
  if (rateLimitCheck.limited) {
    await logDownloadAttempt({
      ip,
      fileId: id,
      action: 'blocked',
      reason: `Rate limited (${rateLimitCheck.remainingTime}s remaining)`,
      userAgent
    })
    console.log(formatLogForConsole({
      ip,
      fileId: id,
      action: 'blocked',
      reason: 'Rate limited'
    }))

    throw createError({
      statusCode: 429,
      message: `Too many failed attempts. Please try again in ${Math.ceil((rateLimitCheck.remainingTime || 0) / 60)} minutes.`
    })
  }

  // Get password from request body
  const body = await readBody(event)
  const password = body?.password

  if (!password) {
    throw createError({
      statusCode: 400,
      message: 'Password is required'
    })
  }

  try {
    // Get file record
    const result = await query(
      `SELECT id, original_name, stored_name, password_hash, file_size, mime_type, download_count, download_limit, is_enabled
       FROM files
       WHERE id = $1`,
      [id]
    )

    // Unified error message - don't reveal if file exists or password is wrong
    const genericError = () => {
      const failResult = recordFailedAttempt(ip, id)
      const logReason = failResult.blocked
        ? 'Invalid credentials - IP now blocked'
        : `Invalid credentials (${failResult.remainingAttempts} attempts remaining)`

      logDownloadAttempt({
        ip,
        fileId: id,
        action: 'failed',
        reason: logReason,
        userAgent
      })
      console.log(formatLogForConsole({
        ip,
        fileId: id,
        action: 'failed',
        reason: logReason
      }))

      throw createError({
        statusCode: 401,
        message: failResult.blocked
          ? 'Too many failed attempts. Please try again later.'
          : 'Invalid file or password'
      })
    }

    if (result.rows.length === 0) {
      genericError()
      return
    }

    const file = result.rows[0]

    // Verify password
    const passwordValid = await bcrypt.compare(password, file.password_hash)

    if (!passwordValid) {
      genericError()
      return
    }

    // Check if file is enabled
    if (file.is_enabled === false) {
      await logDownloadAttempt({
        ip,
        fileId: id,
        fileName: file.original_name,
        action: 'blocked',
        reason: 'File is disabled',
        userAgent
      })
      throw createError({
        statusCode: 403,
        message: 'This file has been disabled by the administrator'
      })
    }

    // Check download limit
    if (file.download_limit !== null && file.download_count >= file.download_limit) {
      await logDownloadAttempt({
        ip,
        fileId: id,
        fileName: file.original_name,
        action: 'blocked',
        reason: `Download limit reached (${file.download_count}/${file.download_limit})`,
        userAgent
      })
      throw createError({
        statusCode: 403,
        message: 'Download limit reached. This file is no longer available for download.'
      })
    }

    // Check if file exists on disk
    const filePath = join(uploadDir, file.stored_name)
    if (!existsSync(filePath)) {
      genericError()
      return
    }

    // Success - clear rate limit for this IP + file combination
    clearRateLimit(ip, id)

    // Log successful download
    await logDownloadAttempt({
      ip,
      fileId: id,
      fileName: file.original_name,
      action: 'success',
      userAgent
    })
    console.log(formatLogForConsole({
      ip,
      fileId: id,
      fileName: file.original_name,
      action: 'success'
    }))

    // Update download count
    await query(
      `UPDATE files SET download_count = download_count + 1 WHERE id = $1`,
      [id]
    )

    // Set headers for file download
    setHeaders(event, {
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.original_name)}"`,
      'Content-Length': file.file_size.toString(),
      'Cache-Control': 'no-store'
    })

    // Stream the file
    const fileStream = createReadStream(filePath)
    return sendStream(event, fileStream)
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Download error:', error)
    throw createError({
      statusCode: 500,
      message: 'Download failed'
    })
  }
})
