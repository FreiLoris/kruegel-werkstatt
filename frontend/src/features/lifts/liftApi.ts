import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Lift = components['schemas']['LiftDto']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'lifts'

/** All lifts including decommissioned ones, in fixed order (for administration). */
export function useAllLifts() {
  return useQuery({
    queryKey: [TOPIC, 'all'],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/lifts', { params: { query: { includeInactive: true } }, signal })),
  })
}

/** Create (without `id`) or rename (with `id` and the loaded `version`). */
export function useSaveLift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, version }: { id?: string; name: string; version?: number }) =>
      id
        ? dataOrThrow(await api.PUT('/api/lifts/{id}', { params: { path: { id } }, body: { name, version } }))
        : dataOrThrow(await api.POST('/api/lifts', { body: { name } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Decommission or put back into service. */
export function useSetLiftActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      active
        ? dataOrThrow(await api.POST('/api/lifts/{id}/activate', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/lifts/{id}/deactivate', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** New order: first ID = leftmost (columns in day view and dashboard). */
export function useReorderLifts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => dataOrThrow(await api.PUT('/api/lifts/order', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
