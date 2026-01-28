import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const LOG_DIR = './logs'
const LOG_FILE = 'download.log'

interface LogEntry {
  timestamp: string
  ip: string
  fileId: string
  fileName?: string
  action: 'attempt' | 'success' | 'failed' | 'blocked'
  reason?: string
  userAgent?: string
}

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const limit = parseInt(queryParams.limit as string) || 100
  const fileId = queryParams.fileId as string

  const logPath = join(LOG_DIR, LOG_FILE)

  if (!existsSync(logPath)) {
    return { logs: [] }
  }

  try {
    const content = await readFile(logPath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    let logs: LogEntry[] = lines
      .map(line => {
        try {
          return JSON.parse(line) as LogEntry
        } catch {
          return null
        }
      })
      .filter((log): log is LogEntry => log !== null)

    // Filter by fileId if specified
    if (fileId) {
      logs = logs.filter(log => log.fileId === fileId)
    }

    // Return most recent first, limited
    logs = logs.reverse().slice(0, limit)

    return { logs }
  } catch (error) {
    console.error('Failed to read logs:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to read logs'
    })
  }
})
