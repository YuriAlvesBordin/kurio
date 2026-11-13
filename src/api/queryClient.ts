import { QueryClient } from '@tanstack/react-query'
import { ClientError } from './errors'

const MAX_RETRIES = 2

/**
 * Retry policy shared by all queries.
 * Only transient failures (network, timeout, 5xx) are retried, never validation, auth or conflict errors.
 * @param count how many retries already happened
 * @param error last failure
 */
function shouldRetry(count: number, error: unknown): boolean {
  if (count >= MAX_RETRIES) return false
  return error instanceof ClientError ? error.retryable : false
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 3000),
      refetchOnWindowFocus: false,
      networkMode: 'always',
    },
    mutations: { retry: false, networkMode: 'always' },
  },
})
