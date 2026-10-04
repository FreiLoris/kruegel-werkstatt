import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type CourtesyCar = components['schemas']['CourtesyCarDto']
export type CourtesyCarRequest = components['schemas']['CourtesyCarRequest']
export type DueStatus = NonNullable<CourtesyCar['serviceStatus']>

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'courtesy-cars'

/** All courtesy cars including inactive ones, in fixed order (for administration). */
export function useAllCourtesyCars() {
  return useQuery({
    queryKey: [TOPIC, 'all'],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/courtesy-cars', { params: { query: { includeInactive: true } }, signal })),
  })
}

/** Create (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveCourtesyCar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: CourtesyCarRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/courtesy-cars/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/courtesy-cars', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Take out of service (sold/returned) or put back into service. */
export function useSetCourtesyCarActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      active
        ? dataOrThrow(await api.POST('/api/courtesy-cars/{id}/activate', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/courtesy-cars/{id}/deactivate', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** New order: first ID = first card on the courtesy car page. */
export function useReorderCourtesyCars() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => dataOrThrow(await api.PUT('/api/courtesy-cars/order', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
