import { useSyncExternalStore } from 'react'
import type { LoginInput, RegisterInput, User } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { ClientError } from '@/api/errors'
import { onSessionRejected } from '@/api/http'
import { keys } from '@/api/keys'
import { queryClient } from '@/api/queryClient'
import { clearGuestId, tokenStorage } from '@/api/storage'

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export interface AuthState {
  status: AuthStatus
  user: User | null
  notice: 'expired' | 'unauthenticated' | null
}

const USER_KEY = 'kurio.user'
const listeners = new Set<() => void>()
let rejectedHandler: ((reason: 'expired' | 'unauthenticated') => void) | null = null

/**
 * Reads the cached user snapshot so a refresh renders as authenticated while the session is verified.
 */
function readSnapshot(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

/**
 * Persists or clears the cached user snapshot.
 * @param user user to cache or null
 */
function writeSnapshot(user: User | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    return
  }
}

const initialUser = tokenStorage.get() ? readSnapshot() : null
let state: AuthState = {
  status: tokenStorage.get() ? (initialUser ? 'authenticated' : 'loading') : 'guest',
  user: initialUser,
  notice: null,
}

/**
 * Replaces the state and notifies subscribers.
 * @param next partial state
 */
function set(next: Partial<AuthState>): void {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

/**
 * Drops every cache entry that belongs to a user or to a cart so nothing leaks to the next session.
 */
function clearPrivateCache(): void {
  queryClient.removeQueries({ queryKey: keys.privateRoot })
  queryClient.removeQueries({ queryKey: keys.cartRoot })
}

export const authStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  /**
   * Verifies the stored token against the server once at startup.
   */
  async bootstrap(): Promise<void> {
    if (!tokenStorage.get()) {
      set({ status: 'guest', user: null })
      return
    }
    try {
      const { user } = await api.session()
      writeSnapshot(user)
      set({ status: 'authenticated', user })
    } catch (error) {
      if (error instanceof ClientError && error.status === 401) {
        tokenStorage.clear()
        writeSnapshot(null)
        clearPrivateCache()
        set({ status: 'guest', user: null })
        return
      }
      set({ status: state.user ? 'authenticated' : 'guest' })
    }
  },

  /**
   * Signs in, merges the guest cart into the user cart and clears anonymous caches.
   * @param input credentials
   */
  async login(input: LoginInput): Promise<User> {
    const response = await api.login(input)
    return finishAuth(response.user, response.token)
  },

  /**
   * Registers a new collector and signs them in.
   * @param input registration data
   */
  async register(input: RegisterInput): Promise<User> {
    const response = await api.register(input)
    return finishAuth(response.user, response.token)
  },

  /**
   * Signs out, revokes the token and clears all private cache.
   */
  async logout(): Promise<void> {
    const token = tokenStorage.get()
    tokenStorage.clear()
    writeSnapshot(null)
    clearPrivateCache()
    set({ status: 'guest', user: null, notice: null })
    if (!token) return
    try {
      await api.logout(token)
    } catch {
      return
    }
  },

  /**
   * Updates the cached user after a profile or avatar change.
   * @param user fresh user
   */
  updateUser(user: User): void {
    writeSnapshot(user)
    set({ user })
  },

  /**
   * Registers the navigation reaction to a rejected session.
   * @param handler callback invoked after local state was cleared
   */
  onRejected(handler: ((reason: 'expired' | 'unauthenticated') => void) | null): void {
    rejectedHandler = handler
  },

  dismissNotice(): void {
    set({ notice: null })
  },
}

/**
 * Stores the new session, merges carts and swaps caches from guest scope to user scope.
 * @param user authenticated user
 * @param token bearer token
 */
async function finishAuth(user: User, token: string): Promise<User> {
  clearPrivateCache()
  tokenStorage.set(token)
  writeSnapshot(user)
  set({ status: 'authenticated', user, notice: null })
  try {
    await api.mergeCart()
  } catch {
    clearGuestId()
  }
  clearGuestId()
  await queryClient.invalidateQueries({ queryKey: keys.cartRoot })
  return user
}

onSessionRejected((reason) => {
  if (!tokenStorage.get()) return
  tokenStorage.clear()
  writeSnapshot(null)
  clearPrivateCache()
  set({ status: 'guest', user: null, notice: reason })
  rejectedHandler?.(reason)
})

/**
 * Subscribes a component to the auth state.
 */
export function useAuth(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.get, authStore.get)
}
