import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Statistics = components['schemas']['StatisticsDto']
export type Count = components['schemas']['CountDto']

/**
 * All numbers of the statistics page (15a). No live topic of its own: the page is looked at now
 * and then – it counts again when opened or when the window gets the focus back.
 */
export function useStatistics() {
  return useQuery({
    queryKey: ['statistics'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/statistics', { signal })),
  })
}
