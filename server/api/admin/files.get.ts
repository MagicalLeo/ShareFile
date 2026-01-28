import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const result = await query(
      `SELECT id, original_name, file_size, mime_type, download_count, download_limit, is_enabled, created_at
       FROM files
       ORDER BY created_at DESC`
    )

    return {
      files: result.rows.map(row => ({
        id: row.id,
        fileName: row.original_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        downloadCount: row.download_count,
        downloadLimit: row.download_limit,
        isEnabled: row.is_enabled,
        createdAt: row.created_at
      }))
    }
  } catch (error) {
    console.error('Failed to fetch files:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch files'
    })
  }
})
