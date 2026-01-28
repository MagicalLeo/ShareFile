// Rate limiter for password attempts
// Blocks IP+FileId combination for 15 minutes after 5 failed attempts

interface RateLimitEntry {
  attempts: number
  firstAttempt: number
  blockedUntil: number | null
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const MAX_ATTEMPTS = 5
const BLOCK_DURATION = 15 * 60 * 1000 // 15 minutes
const WINDOW_DURATION = 15 * 60 * 1000 // 15 minutes window for counting attempts

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.blockedUntil && entry.blockedUntil < now) {
      rateLimitStore.delete(key)
    } else if (now - entry.firstAttempt > WINDOW_DURATION && !entry.blockedUntil) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute

// Generate key from IP and optional fileId
function getKey(ip: string, fileId?: string): string {
  return fileId ? `${ip}:${fileId}` : ip
}

export function isRateLimited(ip: string, fileId?: string): { limited: boolean; remainingTime?: number } {
  const key = getKey(ip, fileId)
  const entry = rateLimitStore.get(key)
  const now = Date.now()

  if (!entry) {
    return { limited: false }
  }

  if (entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      return {
        limited: true,
        remainingTime: Math.ceil((entry.blockedUntil - now) / 1000)
      }
    } else {
      // Block expired, remove entry
      rateLimitStore.delete(key)
      return { limited: false }
    }
  }

  return { limited: false }
}

export function recordFailedAttempt(ip: string, fileId?: string): { blocked: boolean; remainingAttempts?: number } {
  const key = getKey(ip, fileId)
  const now = Date.now()
  let entry = rateLimitStore.get(key)

  if (!entry) {
    entry = {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null
    }
    rateLimitStore.set(key, entry)
    return { blocked: false, remainingAttempts: MAX_ATTEMPTS - 1 }
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_DURATION) {
    entry.attempts = 1
    entry.firstAttempt = now
    entry.blockedUntil = null
    return { blocked: false, remainingAttempts: MAX_ATTEMPTS - 1 }
  }

  entry.attempts++

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION
    return { blocked: true }
  }

  return { blocked: false, remainingAttempts: MAX_ATTEMPTS - entry.attempts }
}

export function clearRateLimit(ip: string, fileId?: string): void {
  const key = getKey(ip, fileId)
  rateLimitStore.delete(key)
}

export function getRateLimitInfo(ip: string, fileId?: string): {
  attempts: number
  isBlocked: boolean
  blockedUntil?: Date
} {
  const key = getKey(ip, fileId)
  const entry = rateLimitStore.get(key)
  if (!entry) {
    return { attempts: 0, isBlocked: false }
  }

  return {
    attempts: entry.attempts,
    isBlocked: entry.blockedUntil ? Date.now() < entry.blockedUntil : false,
    blockedUntil: entry.blockedUntil ? new Date(entry.blockedUntil) : undefined
  }
}
