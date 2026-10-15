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
export type TireLocation = components['schemas']['TireLocationDto']
export type TireLocationRequest = components['schemas']['TireLocationRequest']
export type TirePlace = components['schemas']['TirePlaceDto']
export type TireLocationKind = TireLocation['kind']

/** Topics for query keys and live updates – same text as in the backend. */
const TOPIC = 'tire-sets'
const SETTINGS_TOPIC = 'tire-hotel-settings'
const LOCATIONS_TOPIC = 'tire-locations'

export const SEASONS: Record<Season, string> = { WINTER: 'Winter', SUMMER: 'Sommer', ALL_SEASON: 'Ganzjahr' }
export const KINDS: Record<TireSetKind, string> = { WHEELS: 'Kompletträder', TIRES: 'Nur Reifen' }
export const RIMS: Record<RimKind, string> = { ALU: 'Alu', STEEL: 'Stahl' }
export const LOCATION_KINDS: Record<TireLocationKind, string> = { FLOOR: 'Bodenraster', SHELVES: 'Regale' }

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

/** Onto another place – or the first one of a set without */
export function useMoveTireSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, placeId, note }: { id: string; placeId: string; note?: string }) =>
      dataOrThrow(await api.POST('/api/tire-sets/{id}/move', { params: { path: { id } }, body: { placeId, note } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** The locations in their order (floor grid, shelves) */
export function useTireLocations() {
  return useQuery({
    queryKey: [LOCATIONS_TOPIC, 'locations'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-locations', { signal })),
  })
}

/** All places, by location and position – also the no longer used ones */
export function useTirePlaces() {
  return useQuery({
    queryKey: [LOCATIONS_TOPIC, 'places'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-places', { signal })),
  })
}

/** Create (without `id`) or edit a location – its places follow on the server. */
export function useSaveTireLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: TireLocationRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/tire-locations/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/tire-locations', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [LOCATIONS_TOPIC] }),
  })
}

export function useDeleteTireLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/tire-locations/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [LOCATIONS_TOPIC] }),
  })
}
