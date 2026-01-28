import { createError, readBody } from 'h3'
import bcrypt from 'bcrypt'
import { query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'File ID is required'
    })
  }

  const body = await readBody(event)

  try {
    // Build update query based on provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1
    let newPassword: string | null = null

    if (typeof body.isEnabled === 'boolean') {
      updates.push(`is_enabled = $${paramIndex++}`)
      values.push(body.isEnabled)
    }

    if (body.downloadLimit !== undefined) {
      updates.push(`download_limit = $${paramIndex++}`)
      values.push(body.downloadLimit === null ? null : parseInt(body.downloadLimit, 10))
    }

    // Handle password reset
    if (body.newPassword) {
      newPassword = body.newPassword
      const passwordHash = await bcrypt.hash(newPassword, 10)
      updates.push(`password_hash = $${paramIndex++}`)
      values.push(passwordHash)
    }

    if (updates.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No fields to update'
      })
    }

    values.push(id)

    const result = await query(
      `UPDATE files SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, is_enabled, download_limit`,
      values
    )

    if (result.rows.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      })
    }

    const response: any = {
      success: true,
      file: {
        id: result.rows[0].id,
        isEnabled: result.rows[0].is_enabled,
        downloadLimit: result.rows[0].download_limit
      }
    }

    // Include new password in response if it was reset
    if (newPassword) {
      response.newPassword = newPassword
    }

    return response
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Update file error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update file'
    })
  }
})
