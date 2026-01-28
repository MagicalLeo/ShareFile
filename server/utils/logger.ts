// Download attempt logger
import { appendFile, mkdir } from 'fs/promises'
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

async function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true })
  }
}

export async function logDownloadAttempt(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
  try {
    await ensureLogDir()

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    }

    const logLine = JSON.stringify(logEntry) + '\n'
    await appendFile(join(LOG_DIR, LOG_FILE), logLine)
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export function formatLogForConsole(entry: Omit<LogEntry, 'timestamp'>): string {
  const time = new Date().toISOString()
  const status = entry.action.toUpperCase().padEnd(7)
  const reason = entry.reason ? ` - ${entry.reason}` : ''
  return `[${time}] ${status} | IP: ${entry.ip} | File: ${entry.fileId}${reason}`
}
