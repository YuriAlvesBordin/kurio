const TOKEN_KEY = 'kurio.token'
const GUEST_KEY = 'kurio.guest'

/**
 * Reads a storage key and swallows storage access errors.
 * @param key storage key
 */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Writes or removes a storage key and swallows storage access errors.
 * @param key storage key
 * @param value new value or null to remove
 */
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    return
  }
}

export const tokenStorage = {
  get: () => read(TOKEN_KEY),
  set: (token: string) => write(TOKEN_KEY, token),
  clear: () => write(TOKEN_KEY, null),
}

/**
 * Returns the stable identifier of the anonymous cart, creating it on first use.
 */
export function guestId(): string {
  const existing = read(GUEST_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  write(GUEST_KEY, created)
  return created
}

/**
 * Forgets the anonymous cart identifier after its items were merged into a user cart.
 */
export function clearGuestId(): void {
  write(GUEST_KEY, null)
}
