import { formatDate } from '../../lib/format'
import type { AbsenceCategory, AbsenceSeriesPlan, AbsenceSeriesRequest, SeriesScope, Weekday } from './absenceApi'

/** The weekdays to choose for a series (FB-33) – the workshop works Monday to Friday */
export const SERIES_WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: 'Mo' },
  { value: 'TUESDAY', label: 'Di' },
  { value: 'WEDNESDAY', label: 'Mi' },
  { value: 'THURSDAY', label: 'Do' },
  { value: 'FRIDAY', label: 'Fr' },
]

export const SERIES_SCOPE: Record<SeriesScope, string> = {
  DAY: 'nur dieser Tag',
  FROM_HERE: 'ab diesem Tag',
  ALL: 'ganze Serie',
}

/** What the dialog has for a series – the same fields as one entry plus the weekdays */
export interface SeriesValues {
  employeeId: string
  category: AbsenceCategory
  company: string
  note: string
  startDate: string
  startsAfternoon: boolean
  startTime: string
  endDate: string
  endsNoon: boolean
  endTime: string
  weekdays: Weekday[]
  everyOtherWeek: boolean
}

/**
 * The request for the preview and for saving – `null` while something needed is missing (no preview
 * for half a form). Like one entry: vacation in half days, the rest with optional times.
 */
export function toSeriesRequest(values: SeriesValues): AbsenceSeriesRequest | null {
  const externalWithoutCompany = values.category === 'EXTERNAL_WORK' && !values.company.trim()
  if (!values.employeeId || !values.startDate || !values.endDate || values.endDate < values.startDate || values.weekdays.length === 0 || externalWithoutCompany) {
    return null
  }
  const vacation = values.category === 'VACATION'
  return {
    employeeId: values.employeeId,
    category: values.category,
    company: values.category === 'EXTERNAL_WORK' ? values.company.trim() : undefined,
    note: values.note.trim() || undefined,
    from: values.startDate,
    to: values.endDate,
    weekdays: values.weekdays,
    everyOtherWeek: values.everyOtherWeek,
    startsAfternoon: vacation && values.startsAfternoon,
    startTime: vacation ? null : values.startTime || null,
    // every day of the series is one day: "only afternoon" AND "only morning" would be nothing
    endsNoon: vacation && values.endsNoon && !values.startsAfternoon,
    endTime: vacation ? null : values.endTime || null,
  }
}

/** "Erstellt 39 Einträge vom 02.11.2026 bis 29.01.2027" */
export function planSummary(plan: AbsenceSeriesPlan): string {
  const { days } = plan
  if (days.length === 0) return 'Kein freier Tag mit diesen Wochentagen in diesem Zeitraum'
  if (days.length === 1) return `Erstellt 1 Eintrag am ${formatDate(days[0])}`
  return `Erstellt ${days.length} Einträge vom ${formatDate(days[0])} bis ${formatDate(days[days.length - 1])}`
}

/** The days left out, by date: "25.12.2026 – Feiertag", "05.11.2026 – bereits als Ferien eingetragen" */
export function skippedDays(plan: AbsenceSeriesPlan): string[] {
  return [
    ...plan.holidays.map((day) => ({ day, reason: 'Feiertag' })),
    ...plan.conflicts.map((c) => ({ day: c.day, reason: c.reason })),
  ]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map(({ day, reason }) => `${formatDate(day)} – ${reason}`)
}
