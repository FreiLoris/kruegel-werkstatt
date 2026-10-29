import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type ReminderSettings = components['schemas']['ReminderSettingsDto']
export type ReminderSettingsRequest = components['schemas']['ReminderSettingsRequest']

/** Topic for query keys and live updates – same text as in the backend (ReminderService.TOPIC). */
const TOPIC = 'reminder-settings'

/** Whether and from when customers are reminded the working day before (17a) */
export function useReminderSettings() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/reminder-settings', { signal })),
  })
}

export function useSaveReminderSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: ReminderSettingsRequest) => dataOrThrow(await api.PUT('/api/reminder-settings', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
