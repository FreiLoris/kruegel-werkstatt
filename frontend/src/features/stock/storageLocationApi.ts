import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type StorageLocation = components['schemas']['StorageLocationDto']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'storage-locations'

/** All storage locations including ones no longer used, in fixed order. */
export function useAllStorageLocations() {
  return useQuery({
    queryKey: [TOPIC, 'all'],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/storage-locations', { params: { query: { includeInactive: true } }, signal })),
  })
}

/** Create (without `id`) or rename (with `id` and the loaded `version`). */
export function useSaveStorageLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, version }: { id?: string; name: string; version?: number }) =>
      id
        ? dataOrThrow(await api.PUT('/api/storage-locations/{id}', { params: { path: { id } }, body: { name, version } }))
        : dataOrThrow(await api.POST('/api/storage-locations', { body: { name } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** No longer use or use again. */
export function useSetStorageLocationActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      active
        ? dataOrThrow(await api.POST('/api/storage-locations/{id}/activate', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/storage-locations/{id}/deactivate', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** New order: first ID = top (filter and form of the stock list). */
export function useReorderStorageLocations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => dataOrThrow(await api.PUT('/api/storage-locations/order', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
