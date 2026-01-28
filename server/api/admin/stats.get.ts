import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { query } from '../../utils/db'

const LOG_DIR = './logs'
const LOG_FILE = 'download.log'

interface LogEntry {
  timestamp: string
  ip: string
  fileId: string
  fileName?: string
  action: 'attempt' | 'success' | 'failed' | 'blocked'
  reason?: string
}

export default defineEventHandler(async () => {
  try {
    // Basic stats from database
    const filesResult = await query(`
      SELECT
        COUNT(*) as total_files,
        COALESCE(SUM(download_count), 0) as total_downloads,
        COALESCE(SUM(file_size), 0) as total_size,
        COUNT(CASE WHEN is_enabled = true THEN 1 END) as active_files,
        COUNT(CASE WHEN is_enabled = false THEN 1 END) as disabled_files
      FROM files
    `)

    // File types distribution
    const fileTypes = await query(`
      SELECT
        CASE
          WHEN mime_type LIKE 'image/%' THEN 'Images'
          WHEN mime_type LIKE 'video/%' THEN 'Videos'
          WHEN mime_type LIKE 'audio/%' THEN 'Audio'
          WHEN mime_type LIKE 'application/pdf' THEN 'PDF'
          WHEN mime_type LIKE 'application/zip' OR mime_type LIKE 'application/x-rar%' OR mime_type LIKE 'application/x-7z%' THEN 'Archives'
          WHEN mime_type LIKE 'text/%' OR mime_type LIKE 'application/json' THEN 'Text'
          ELSE 'Other'
        END as type,
        COUNT(*) as count,
        SUM(file_size) as size
      FROM files
      GROUP BY type
      ORDER BY count DESC
    `)

    // Top downloaded files
    const topFiles = await query(`
      SELECT id, original_name, download_count, file_size
      FROM files
      WHERE download_count > 0
      ORDER BY download_count DESC
      LIMIT 5
    `)

    // Recent uploads (last 7 days)
    const recentUploads = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM files
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)

    const stats = filesResult.rows[0]

    // Read logs from file
    let logs: LogEntry[] = []
    const logPath = join(LOG_DIR, LOG_FILE)
    if (existsSync(logPath)) {
      const content = await readFile(logPath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      logs = lines
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry
          } catch {
            return null
          }
        })
        .filter((log): log is LogEntry => log !== null)
    }

    // Filter logs to last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentLogs = logs.filter(log => new Date(log.timestamp) >= thirtyDaysAgo)

    // Filter logs to last 7 days for daily stats
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekLogs = logs.filter(log => new Date(log.timestamp) >= sevenDaysAgo)

    // Count downloads per day (last 7 days)
    const downloadsByDay: Record<string, number> = {}
    weekLogs
      .filter(log => log.action === 'success')
      .forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0]
        downloadsByDay[date] = (downloadsByDay[date] || 0) + 1
      })

    // Process daily downloads into array with all 7 days
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days.push({
        date: dateStr,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        downloads: downloadsByDay[dateStr] || 0
      })
    }

    // Process uploads similarly
    const uploadsLast7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const found = recentUploads.rows.find((d: any) => d.date?.toISOString().split('T')[0] === dateStr)
      uploadsLast7Days.push({
        date: dateStr,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        uploads: found ? parseInt(found.count) : 0
      })
    }

    // Calculate success rate from logs
    const successCount = recentLogs.filter(l => l.action === 'success').length
    const failedCount = recentLogs.filter(l => l.action === 'failed').length
    const totalAttempts = successCount + failedCount
    const successRate = totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 100) : 100

    return {
      overview: {
        totalFiles: parseInt(stats.total_files) || 0,
        totalDownloads: parseInt(stats.total_downloads) || 0,
        totalSize: parseInt(stats.total_size) || 0,
        activeFiles: parseInt(stats.active_files) || 0,
        disabledFiles: parseInt(stats.disabled_files) || 0
      },
      charts: {
        dailyDownloads: last7Days,
        dailyUploads: uploadsLast7Days,
        fileTypes: fileTypes.rows.map((r: any) => ({
          type: r.type,
          count: parseInt(r.count),
          size: parseInt(r.size)
        })),
        successRate,
        totalAttempts
      },
      topFiles: topFiles.rows.map((f: any) => ({
        id: f.id,
        fileName: f.original_name,
        downloads: f.download_count,
        size: parseInt(f.file_size)
      }))
    }
  } catch (error: any) {
    console.error('Stats error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to load statistics'
    })
  }
})
