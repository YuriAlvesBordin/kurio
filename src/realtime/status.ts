import { useSyncExternalStore } from 'react'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

let status: RealtimeStatus = 'idle'
const listeners = new Set<() => void>()

/**
 * Updates the connection status and notifies subscribers.
 * @param next new status
 */
export function setRealtimeStatus(next: RealtimeStatus): void {
  if (status === next) return
  status = next
  listeners.forEach((listener) => listener())
}

/**
 * Subscribes a component to the realtime connection status.
 */
export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => status,
    () => status,
  )
}
