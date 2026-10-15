import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type TireSet = components['schemas']['TireSetDto']
export type TireSetEvent = components['schemas']['TireSetEventDto']
export type TireSetRequest = components['schemas']['TireSetRequest']
export type TreadDepths = components['schemas']['TreadDepths']
/** Depths as sent: a wheel not measured is left out */
export type DepthsRequest = components['schemas']['DepthsRequest']
export type TreadLimits = components['schemas']['TireHotelSettingsDto']
export type Season = TireSet['season']
export type TireSetKind = TireSet['kind']
export type RimKind = NonNullable<TireSet['rims']>

/** Topics for query keys and live updates – same text as in the backend. */
const TOPIC = 'tire-sets'
const SETTINGS_TOPIC = 'tire-hotel-settings'

export const SEASONS: Record<Season, string> = { WINTER: 'Winter', SUMMER: 'Sommer', ALL_SEASON: 'Ganzjahr' }
export const KINDS: Record<TireSetKind, string> = { WHEELS: 'Kompletträder', TIRES: 'Nur Reifen' }
export const RIMS: Record<RimKind, string> = { ALU: 'Alu', STEEL: 'Stahl' }

/** The sets in the hotel (newest first) – or the retrieved ones. Searched in the browser: a few hundred sets. */
export function useTireSets(inHotel: boolean) {
  return useQuery({
    queryKey: [TOPIC, 'list', inHotel],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-sets', { params: { query: { inHotel } }, signal })),
  })
}

export function useTireSet(id: string | undefined) {
  return useQuery({
    queryKey: [TOPIC, 'one', id],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-sets/{id}', { params: { path: { id: id! } }, signal })),
    enabled: !!id,
  })
}

/** Stored, measured, retrieved – oldest first */
export function useTireSetHistory(id: string) {
  return useQuery({
    queryKey: [TOPIC, 'history', id],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-sets/{id}/history', { params: { path: { id } }, signal })),
  })
}

/** Store (without `id`) or edit the data (with `id`; the request then contains the loaded `version`). */
export function useSaveTireSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: TireSetRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/tire-sets/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/tire-sets', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useMeasureTireSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, depths, on, note }: { id: string; depths: DepthsRequest; on: string; note?: string }) =>
      dataOrThrow(await api.POST('/api/tire-sets/{id}/measurements', { params: { path: { id } }, body: { depths, on, note } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useRetrieveTireSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, on, note }: { id: string; on?: string; note?: string }) =>
      dataOrThrow(await api.POST('/api/tire-sets/{id}/retrieve', { params: { path: { id } }, body: { on, note } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useTreadLimits() {
  return useQuery({
    queryKey: [SETTINGS_TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-hotel-settings', { signal })),
  })
}

export function useSaveTreadLimits() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: components['schemas']['TireHotelSettingsRequest']) =>
      dataOrThrow(await api.PUT('/api/tire-hotel-settings', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [SETTINGS_TOPIC] }),
  })
}
