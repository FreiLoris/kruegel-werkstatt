import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'
import { todayIso } from '../../lib/format'

export type PublicHoliday = components['schemas']['PublicHolidayDto']

/**
 * Public holidays of the canton of Zurich in a period. They are computed, never change → loaded
 * once per period and kept.
 */
export function usePublicHolidays(from: string, to: string) {
  return useQuery({
    queryKey: ['public-holidays', from, to],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/public-holidays', { params: { query: { from, to } }, signal })),
    staleTime: Infinity,
  })
}

/** Holidays of last, this and next year as date → name – enough for every appointment that is planned. */
export function useHolidayNames(): ReadonlyMap<string, string> {
  const year = Number(todayIso().slice(0, 4))
  const { data } = usePublicHolidays(`${year - 1}-01-01`, `${year + 1}-12-31`)
  return useMemo(() => new Map((data ?? []).map((holiday) => [holiday.date, holiday.name])), [data])
}
