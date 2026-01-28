import { createError } from 'h3'
import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'File ID is required'
    })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file ID format'
    })
  }

  try {
    const result = await query(
      `SELECT id, original_name, file_size, mime_type, download_count, download_limit, is_enabled, created_at
       FROM files
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      })
    }

    const file = result.rows[0]

    // Check if file is disabled
    if (file.is_enabled === false) {
      throw createError({
        statusCode: 403,
        message: 'This file has been disabled'
      })
    }

    // Check if download limit reached
    const limitReached = file.download_limit !== null && file.download_count >= file.download_limit

    return {
      id: file.id,
      fileName: file.original_name,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      downloadCount: file.download_count,
      downloadLimit: file.download_limit,
      limitReached,
      createdAt: file.created_at
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Get file info error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to get file information'
    })
  }
})
