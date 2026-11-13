import axios from 'axios'
import { toClientError } from './errors'
import { networkGate } from './gate'
import { guestId, tokenStorage } from './storage'

type SessionListener = (reason: 'expired' | 'unauthenticated') => void

let sessionListener: SessionListener | null = null

/**
 * Registers the single handler notified when the server rejects the current session.
 * @param listener callback or null to detach
 */
export function onSessionRejected(listener: SessionListener | null): void {
  sessionListener = listener
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: Number(import.meta.env.VITE_HTTP_TIMEOUT_MS ?? 8000),
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use(async (config) => {
  await networkGate
  const token = tokenStorage.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Id', guestId())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalized = toClientError(error)
    const hadToken = Boolean(tokenStorage.get())
    if (hadToken && normalized.status === 401 && (normalized.code === 'SESSION_EXPIRED' || normalized.code === 'UNAUTHENTICATED')) {
      sessionListener?.(normalized.code === 'SESSION_EXPIRED' ? 'expired' : 'unauthenticated')
    }
    return Promise.reject(normalized)
  },
)
