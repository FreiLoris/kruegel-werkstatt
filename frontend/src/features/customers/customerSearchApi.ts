import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type CustomerSearchHit = components['schemas']['CustomerSearchHitDto']
export type Customer = components['schemas']['CustomerDto']
export type Vehicle = components['schemas']['VehicleDto']

/** The backend needs at least this many characters. */
export const MIN_SEARCH_LENGTH = 2

/**
 * Customer search (name, company, address, phone, plate …). Every word must occur.
 * Runs only from {@link MIN_SEARCH_LENGTH} characters; while typing the previous hits stay visible.
 *
 * Query key starts with "customers": a changed customer reloads the search (live update).
 */
export function useCustomerSearch(query: string, limit = 20) {
  const q = query.trim()
  return useQuery({
    queryKey: ['customers', 'search', q, limit],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/customer-search', { params: { query: { q, limit } }, signal })),
    enabled: q.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  })
}
