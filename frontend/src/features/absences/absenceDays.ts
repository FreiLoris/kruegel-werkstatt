import { formatTime } from '../../lib/format'
import type { Absence } from './absenceApi'

/** Which part of a day someone is away */
export type DayPart = 'full' | 'morning' | 'afternoon'

/** An absence as seen on one day */
export interface AbsenceOnDay {
  absence: Absence
  part: DayPart
  /** FB-05: the times on this day, e.g. "bis 10:30", "ab 14:00", "09:00–10:30"; empty = none */
  time: string | null
}

const NOON = '12:00'

/** "09:00:00" → "09:00" (the API sends seconds) */
const hhmm = (time: string | null | undefined) => (time ? formatTime(time) : null)

/**
 * Who is away on `date` and for which part of it: the first day may start at noon or at a time
 * (afternoon from 12:00), the last day may end at noon or at a time. Sorted morning – full –
 * afternoon, then by start.
 */
export function absencesOn(absences: Absence[], date: string): AbsenceOnDay[] {
  const order: Record<DayPart, number> = { morning: 0, full: 1, afternoon: 2 }
  return absences
    .filter((a) => a.startDate <= date && date <= a.endDate)
    .map((absence) => ({ absence, ...onDay(absence, date) }))
    .sort(
      (a, b) =>
        order[a.part] - order[b.part] ||
        a.absence.startDate.localeCompare(b.absence.startDate) ||
        (a.time ?? '').localeCompare(b.time ?? ''),
    )
}

/** The part of the day and the times that apply on `date` */
function onDay(absence: Absence, date: string): { part: DayPart; time: string | null } {
  const from = date === absence.startDate ? hhmm(absence.startTime) : null
  const until = date === absence.endDate ? hhmm(absence.endTime) : null
  if (from || until) {
    const time = from && until ? `${from}–${until}` : from ? `ab ${from}` : `bis ${until}`
    // the half of the day it lies in – both halves when it goes over noon
    const part: DayPart = until && until <= NOON ? 'morning' : from && from >= NOON ? 'afternoon' : 'full'
    return { part, time }
  }
  if (date === absence.startDate && absence.startsAfternoon) return { part: 'afternoon', time: null }
  if (date === absence.endDate && absence.endsNoon) return { part: 'morning', time: null }
  return { part: 'full', time: null }
}

/** "Vormittag" / "Nachmittag" / "" – shown next to the name */
export function partLabel(part: DayPart): string {
  return part === 'morning' ? 'Vormittag' : part === 'afternoon' ? 'Nachmittag' : ''
}

/** What to show next to the name on that day: the times, else the half day, else nothing */
export function dayLabel(day: Pick<AbsenceOnDay, 'part' | 'time'>): string {
  return day.time ?? partLabel(day.part)
}
