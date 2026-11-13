import { useLocation, useNavigate } from '@tanstack/react-router'
import { withoutAuthParams } from '@/routes/search'

/**
 * Returns a function that opens the login or signup modal over the current page.
 * The current location is kept as the redirect target so the flow resumes after authentication.
 */
export function useOpenAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  return (mode: 'login' | 'register', extra?: { reason?: 'expired' }) => {
    const redirect = withoutAuthParams(location.pathname, location.searchStr)
    void navigate({
      to: location.pathname,
      search: (previous: Record<string, unknown>) => ({ ...previous, auth: mode, reason: extra?.reason, redirect: redirect === '/' ? undefined : redirect }),
      replace: false,
    } as never)
  }
}
