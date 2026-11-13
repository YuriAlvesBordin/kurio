import { useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query so layout specific subtrees mount only when their viewport is active.
 * @param query media query such as `(min-width: 768px)`
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * True from the tablet breakpoint up, matching Tailwind's `md` variant.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
