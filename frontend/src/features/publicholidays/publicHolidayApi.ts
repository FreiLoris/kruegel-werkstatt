import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type PublicHoliday = components['schemas']['PublicHolidayDto']

/**
 * Public holidays of the canton of Zurich in a period. They are computed, never change → loaded
 * once per period and kept.
 */
export function usePublicHolidays(from: string, to: string) {
  return useQuery({
    queryKey: ['public-holidays', from, to],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/public-holidays', { params: { query: { from, to } }, signal })),
    staleTime: Infinity,
  })
}
