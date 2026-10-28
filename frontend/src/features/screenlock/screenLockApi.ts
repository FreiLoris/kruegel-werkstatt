import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type ScreenLockSettings = components['schemas']['ScreenLockSettingsDto']
export type ScreenLockSettingsRequest = components['schemas']['ScreenLockSettingsRequest']

/** Topic for query keys and live updates – same text as in the backend (ScreenLockService.TOPIC). */
const TOPIC = 'screen-lock-settings'

/** After how many minutes without use a device asks who is at it (FB-29); 0 = never */
export function useScreenLockSettings() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/screen-lock-settings', { signal })),
  })
}

export function useSaveScreenLockSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: ScreenLockSettingsRequest) => dataOrThrow(await api.PUT('/api/screen-lock-settings', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
