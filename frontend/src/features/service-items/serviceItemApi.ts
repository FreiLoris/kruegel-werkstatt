import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type ServiceItem = components['schemas']['ServiceItemDto']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'service-items'

/** All service items including ones no longer offered, in fixed order (for administration). */
export function useAllServiceItems() {
  return useQuery({
    queryKey: [TOPIC, 'all'],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/service-items', { params: { query: { includeInactive: true } }, signal })),
  })
}

/** Create (without `id`) or rename (with `id` and the loaded `version`). */
export function useSaveServiceItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, version }: { id?: string; name: string; version?: number }) =>
      id
        ? dataOrThrow(await api.PUT('/api/service-items/{id}', { params: { path: { id } }, body: { name, version } }))
        : dataOrThrow(await api.POST('/api/service-items', { body: { name } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** No longer offer or offer again. */
export function useSetServiceItemActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      active
        ? dataOrThrow(await api.POST('/api/service-items/{id}/activate', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/service-items/{id}/deactivate', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** New order: first ID = top (checkboxes on a task, task sheet). */
export function useReorderServiceItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => dataOrThrow(await api.PUT('/api/service-items/order', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
