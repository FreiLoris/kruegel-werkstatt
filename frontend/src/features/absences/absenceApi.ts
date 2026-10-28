import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Absence = components['schemas']['AbsenceDto']
export type AbsenceRequest = components['schemas']['AbsenceRequest']
export type AbsenceSeriesRequest = components['schemas']['AbsenceSeriesRequest']
export type AbsenceSeriesPlan = components['schemas']['AbsenceSeriesPlanDto']
export type Weekday = AbsenceSeriesRequest['weekdays'][number]
/** Which days of a series a change or delete is for (FB-33) */
export type SeriesScope = 'DAY' | 'FROM_HERE' | 'ALL'
export type AbsenceCategory = Absence['category']

/** Topic for query keys and live updates – same text as in the backend (AbsenceService.TOPIC). */
const TOPIC = 'absences'

/** The names of the categories – the ONE place for them (bug #1: "Ferien" vs. 'ferien'). */
export const ABSENCE_CATEGORY: Record<AbsenceCategory, string> = {
  VACATION: 'Ferien',
  SICK: 'Krank',
  EXTERNAL_WORK: 'Fremdarbeit',
  TRAINING: 'Kurs',
  // the opposite (12b): someone with flexible hours says when they are in
  PRESENT: 'Anwesend',
}

/** "Abwesenheit" – or "Anwesenheit" for the one category that is none */
export const entryNoun = (category: AbsenceCategory) => (category === 'PRESENT' ? 'Anwesenheit' : 'Abwesenheit')

/** Absences touching the days `from`–`to` (both inclusive). */
export function useAbsences(from: string, to: string, employeeId?: string) {
  return useQuery({
    queryKey: [TOPIC, from, to, employeeId],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/absences', { params: { query: { from, to, employeeId } }, signal })),
  })
}

/** Enter (without `id`) or change (with `id`; the request then contains the loaded `version`). */
export function useSaveAbsence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: AbsenceRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/absences/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/absences', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/**
 * What a series would make (FB-33) – asked while the dialog is filled in; nothing saved. `null` = not
 * complete yet.
 */
export function useSeriesPreview(request: AbsenceSeriesRequest | null) {
  return useQuery({
    queryKey: [TOPIC, 'series-preview', request],
    queryFn: request ? async ({ signal }) => dataOrThrow(await api.POST('/api/absences/series/preview', { body: request, signal })) : skipToken,
    // while typing: keep showing the last count instead of flickering
    placeholderData: (previous) => previous,
  })
}

/** One entry per day of the preview, all in one series (FB-33). */
export function useCreateSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: AbsenceSeriesRequest) => dataOrThrow(await api.POST('/api/absences/series', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Category, times, note … for the day, from it on or the whole series – each keeps its day (FB-33). */
export function useUpdateSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, scope, request }: { id: string; scope: SeriesScope; request: AbsenceRequest }) =>
      dataOrThrow(await api.PUT('/api/absences/{id}/series', { params: { path: { id }, query: { scope } }, body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** The day, from it on or the whole series (FB-33). */
export function useDeleteSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, scope }: { id: string; scope: SeriesScope }) => {
      const { error, response } = await api.DELETE('/api/absences/{id}/series', { params: { path: { id }, query: { scope } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Entered by mistake – really gone. */
export function useDeleteAbsence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/absences/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export type AbsenceStatistics = components['schemas']['AbsenceStatisticsDto']
export type PersonStatistics = components['schemas']['PersonStatisticsDto']

/** The absences of a year counted on the server (working days, half days 0.5) – live with the absences. */
export function useAbsenceStatistics(year: number) {
  return useQuery({
    queryKey: [TOPIC, 'statistics', year],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/absences/statistics', { params: { query: { year } }, signal })),
  })
}
