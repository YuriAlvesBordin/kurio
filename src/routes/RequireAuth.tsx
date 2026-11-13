import type { ReactNode } from 'react'
import { Navigate, useLocation } from '@tanstack/react-router'
import { Shell } from '@/components/layout/Shell'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authStore'

/**
 * Guards private screens. Guests are sent to the login modal with the target as redirect.
 * When the session just expired the screen stays mounted behind the modal so context is preserved.
 * @param props protected content
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, notice } = useAuth()
  const location = useLocation()
  const search = location.search as { auth?: string }

  if (status === 'loading') {
    return (
      <Shell>
        <div className="page-container py-10" aria-busy="true">
          <Skeleton className="h-64 w-full" />
        </div>
      </Shell>
    )
  }
  if (user) return <>{children}</>
  if (notice === 'expired' || search.auth) {
    return (
      <Shell>
        <div role="status" className="page-container py-24 text-center text-sm text-muted">
          Entre novamente para continuar.
        </div>
      </Shell>
    )
  }
  return <Navigate to="/" search={{ auth: 'login', redirect: `${location.pathname}${location.searchStr}` } as never} replace />
}
