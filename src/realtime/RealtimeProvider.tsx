import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tokenStorage } from '@/api/storage'
import { useAuth } from '@/features/auth/authStore'
import { RealtimeController } from './controller'
import { useRealtimeStatus } from './status'

/**
 * Owns the websocket lifecycle: one controller per identity, fully torn down when the user changes or logs out.
 */
export function RealtimeProvider() {
  const client = useQueryClient()
  const { user, status } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    if (status === 'loading') return
    const controller = new RealtimeController(client, { userId, token: tokenStorage.get() })
    controller.start()
    return () => controller.stop()
  }, [client, userId, status])

  return <RealtimeBanner />
}

/**
 * Announces degraded realtime connectivity so users know prices may be stale.
 */
function RealtimeBanner() {
  const status = useRealtimeStatus()
  if (status !== 'reconnecting') return null
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[70] bg-primary px-4 py-2 text-center text-xs font-bold text-ink">
      Reconectando ao servidor em tempo real. Os preços podem estar desatualizados.
    </div>
  )
}
