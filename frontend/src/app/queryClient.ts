import { MutationCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/errors'
import { resetChoice } from '../lib/devicePerson'

/**
 * Central management of all data queries (TanStack Query).
 *
 * TanStack Query takes care of loading, caching and reloading server data.
 * Components only ask `useQuery(...)` – no hand-made useEffect/useState juggling.
 */
/**
 * A failed attempt is retried once (e.g. short Wi-Fi drop-out) – but not when the server clearly
 * answered "no" (4xx: not found, not allowed …): asking again gives the same answer. Status 0 is
 * no answer at all (network down, see api/client.ts) – that one is worth a second try.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  const refused = error instanceof ApiError && error.problem.status > 0 && error.problem.status < 500
  return failureCount < 1 && !refused
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      // 403 = the backend does not know this device's person (anymore) → let it choose again
      if (error instanceof ApiError && error.problem.status === 403) {
        resetChoice()
      }
    },
  }),
  defaultOptions: {
    queries: {
      // Data counts as fresh for 30 s. Changes from other devices additionally arrive
      // immediately via live update.
      staleTime: 30_000,
      retry: shouldRetry,
    },
  },
})
