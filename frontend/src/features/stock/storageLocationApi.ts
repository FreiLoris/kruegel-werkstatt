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

/** Create (without `id`, inside `parentId` or at the top level) or rename (with `id` and the loaded `version`). */
export function useSaveStorageLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, parentId, version }: { id?: string; name: string; parentId?: string | null; version?: number }) =>
      id
        ? dataOrThrow(await api.PUT('/api/storage-locations/{id}', { params: { path: { id } }, body: { name, version } }))
        : dataOrThrow(await api.POST('/api/storage-locations', { body: { name, parentId: parentId ?? null } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Into another place (`parentId`) or to the top level (`null`) – with everything inside it. */
export function useMoveStorageLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) =>
      dataOrThrow(await api.PUT('/api/storage-locations/{id}/parent', { params: { path: { id } }, body: { parentId } })),
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

/** New order within one level: first ID = top. */
export function useReorderStorageLocations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => dataOrThrow(await api.PUT('/api/storage-locations/order', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
