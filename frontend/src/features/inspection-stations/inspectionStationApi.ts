import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type InspectionStation = components['schemas']['InspectionStationDto']
export type InspectionStationRequest = components['schemas']['InspectionStationRequest']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'inspection-stations'

/** All inspection stations, the standard first – also the ones no longer used: old tasks still name them. */
export function useInspectionStations() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/inspection-stations', { signal })),
  })
}

/** Create (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveInspectionStation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: InspectionStationRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/inspection-stations/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/inspection-stations', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Preset on new tasks from now on, instead of the one so far. */
export function useMakeStandardStation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => dataOrThrow(await api.POST('/api/inspection-stations/{id}/standard', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** No longer use (instead of delete) or use again. */
export function useSetInspectionStationActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      active
        ? dataOrThrow(await api.POST('/api/inspection-stations/{id}/activate', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/inspection-stations/{id}/deactivate', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
