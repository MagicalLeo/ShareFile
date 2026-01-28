import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const uploadDir = config.uploadDir as string
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
    // Get file info first
    const result = await query(
      `SELECT stored_name FROM files WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      })
    }

    const storedName = result.rows[0].stored_name
    const filePath = join(uploadDir, storedName)

    // Delete from database
    await query(`DELETE FROM files WHERE id = $1`, [id])

    // Delete file from disk
    if (existsSync(filePath)) {
      await unlink(filePath)
    }

    return { success: true, message: 'File deleted' }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Delete file error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete file'
    })
  }
})
