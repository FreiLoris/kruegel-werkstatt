import { useQuery } from '@tanstack/react-query'
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
