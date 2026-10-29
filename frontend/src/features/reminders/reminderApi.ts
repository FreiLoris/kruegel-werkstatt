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

export type Reminder = components['schemas']['ReminderDto']
export type ReminderOutcome = Reminder['outcome']
export type ToCall = components['schemas']['ToCallDto']

/** The reminders of a task, the latest first (17d) */
export function useTaskReminders(taskId: string) {
  return useQuery({
    queryKey: ['reminders', taskId],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/reminders', { params: { query: { taskId } }, signal })),
  })
}

/** Customers to bring their car that day who got no SMS – to be called (17d) */
export function useToCall(date: string) {
  return useQuery({
    queryKey: ['reminders', 'to-call', date],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/reminders/to-call', { params: { query: { date } }, signal })),
  })
}
