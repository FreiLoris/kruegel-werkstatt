import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'
import { useToday } from '../../lib/clock'

export type PublicHoliday = components['schemas']['PublicHolidayDto']
export type PublicHolidaySettings = components['schemas']['PublicHolidaySettingsDto']
export type PublicHolidaySettingsRequest = components['schemas']['PublicHolidaySettingsRequest']

/** Topic for query keys and live updates – same text as in the backend (PublicHolidaySettingsService.TOPIC). */
const TOPIC = 'public-holidays'

/**
 * The workshop's public holidays in a period. Computed, they change only in the settings (neutral 2) –
 * kept until then; a change reloads them on every device (live topic).
 */
export function usePublicHolidays(from: string, to: string) {
  return useQuery({
    queryKey: [TOPIC, from, to],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/public-holidays', { params: { query: { from, to } }, signal })),
    staleTime: Infinity,
  })
}

/** Holidays of last, this and next year as date → name – enough for every appointment that is planned. */
export function useHolidayNames(): ReadonlyMap<string, string> {
  const year = Number(useToday().slice(0, 4))
  const { data } = usePublicHolidays(`${year - 1}-01-01`, `${year + 1}-12-31`)
  return useMemo(() => new Map((data ?? []).map((holiday) => [holiday.date, holiday.name])), [data])
}

/** Every public holiday the app knows, the workshop's ones chosen (neutral 2) */
export function usePublicHolidaySettings() {
  return useQuery({
    queryKey: [TOPIC, 'settings'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/public-holidays/settings', { signal })),
  })
}

export function useSavePublicHolidaySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: PublicHolidaySettingsRequest) =>
      dataOrThrow(await api.PUT('/api/public-holidays/settings', { body: request })),
    // the calendars too, not only the settings – and the vacation statistics, which count working days
    onSettled: () => Promise.all([TOPIC, 'absences'].map((topic) => queryClient.invalidateQueries({ queryKey: [topic] }))),
  })
}
