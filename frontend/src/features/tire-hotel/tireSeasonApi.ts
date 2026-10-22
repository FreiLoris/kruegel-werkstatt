import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'
import { useToday } from '../../lib/clock'

export type SeasonChange = components['schemas']['SeasonChangeDto']
export type SeasonEntry = components['schemas']['SeasonChangeEntryDto']
export type SeasonGroup = SeasonEntry['group']
export type SeasonSettings = components['schemas']['TireSeasonSettingsDto']
export type SeasonSettingsRequest = components['schemas']['TireSeasonSettingsRequest']

/**
 * Topics – same text as in the backend. The overview hangs on the sets: storing, retrieving and
 * acknowledging reload it.
 */
const TOPIC = 'tire-sets'
const SETTINGS_TOPIC = 'tire-hotel-settings'

/** A tyre change planned in a task changes it too – see the live updates */
export const SEASON_CHANGE_KEY = [TOPIC, 'season-change'] as const

/** The season change overview of today (FB-21) – a new day (the TV stays on overnight) loads it again */
export function useSeasonChange() {
  const today = useToday()
  return useQuery({
    queryKey: [...SEASON_CHANGE_KEY, today],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-season', { signal })),
  })
}

/** "Quittieren": not changed in the season of `deadline` on purpose */
export function useAcknowledge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: { tireSetId: string; deadline: string; reason?: string }) =>
      dataOrThrow(await api.POST('/api/tire-season/acks', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SEASON_CHANGE_KEY }),
  })
}

export function useUndoAcknowledge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/tire-season/acks/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SEASON_CHANGE_KEY }),
  })
}

export function useSeasonSettings() {
  return useQuery({
    queryKey: [SETTINGS_TOPIC, 'season'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tire-season-settings', { signal })),
  })
}

export function useSaveSeasonSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: SeasonSettingsRequest) => dataOrThrow(await api.PUT('/api/tire-season-settings', { body: request })),
    // other deadlines – another season shown
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [SETTINGS_TOPIC] }),
        queryClient.invalidateQueries({ queryKey: SEASON_CHANGE_KEY }),
      ]),
  })
}
