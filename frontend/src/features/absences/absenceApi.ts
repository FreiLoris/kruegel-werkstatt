import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Absence = components['schemas']['AbsenceDto']
export type AbsenceRequest = components['schemas']['AbsenceRequest']
export type AbsenceCategory = Absence['category']

/** Topic for query keys and live updates – same text as in the backend (AbsenceService.TOPIC). */
const TOPIC = 'absences'

/** The names of the categories – the ONE place for them (bug #1: "Ferien" vs. 'ferien'). */
export const ABSENCE_CATEGORY: Record<AbsenceCategory, string> = {
  VACATION: 'Ferien',
  SICK: 'Krank',
  EXTERNAL_WORK: 'Fremdarbeit',
  TRAINING: 'Kurs',
}

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
