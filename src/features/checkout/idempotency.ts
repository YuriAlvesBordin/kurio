import { ClientError } from '@/api/errors'

interface StoredKey {
  key: string
  fingerprint: string
}

/**
 * Builds the storage key that holds the idempotency key of the in-flight order for a user.
 * @param userId authenticated user
 */
function slot(userId: string): string {
  return `kurio.idempotency.${userId}`
}

/**
 * Returns the key for an order payload. The same payload always gets the same key so a retry after
 * a timeout replays the original order. A different payload gets a new key.
 * @param userId authenticated user
 * @param fingerprint stable digest of the payload
 */
export function idempotencyKeyFor(userId: string, fingerprint: string): string {
  try {
    const raw = sessionStorage.getItem(slot(userId))
    if (raw) {
      const stored = JSON.parse(raw) as StoredKey
      if (stored.fingerprint === fingerprint) return stored.key
    }
  } catch {
    return crypto.randomUUID()
  }
  const created = crypto.randomUUID()
  try {
    sessionStorage.setItem(slot(userId), JSON.stringify({ key: created, fingerprint } satisfies StoredKey))
  } catch {
    return created
  }
  return created
}

/**
 * Forgets the key once the order reached a terminal state or was created successfully.
 * @param userId authenticated user
 */
export function clearIdempotencyKey(userId: string): void {
  try {
    sessionStorage.removeItem(slot(userId))
  } catch {
    return
  }
}

/**
 * Creates a stable digest of any JSON value to detect payload changes between attempts.
 * @param value payload
 */
export function fingerprintOf(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 5381
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0
  return `${text.length}:${(hash >>> 0).toString(16)}`
}

/**
 * Repeats a request that may have been processed even though the answer was lost.
 * Only timeouts and network failures are repeated, and the caller must reuse the same idempotency key
 * so the server replays the original order instead of creating a second one.
 * @param send function that performs the request
 * @param attempts maximum number of calls
 * @param delayMs pause between calls in milliseconds
 */
export async function retryWithSameKey<T>(send: () => Promise<T>, attempts = 3, delayMs = 600): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await send()
    } catch (error) {
      lastError = error
      const recoverable = error instanceof ClientError && (error.code === 'TIMEOUT' || error.code === 'NETWORK')
      if (!recoverable || attempt === attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw lastError
}
