import { addDays, minutesBetween } from '../../lib/format'
import type { Absence } from './absenceApi'

/**
 * The absence calendar (9b) as pure calculations: which days a month has, where an absence lies
 * in a person's row and whether a dragged-open period is still free. Positions are counted in
 * HALF days from the morning of the first day shown – an absence can start at noon or end at noon.
 */

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/** "2026-10" – a month as it stands in the address */
export const isMonth = (text: string | null): text is string => text !== null && MONTH.test(text)

/** "2026-10-15" → "2026-10" */
export const monthOf = (isoDate: string) => isoDate.slice(0, 7)

/** "2026-10" → "Oktober 2026" */
export function monthTitle(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`
}

/** "2026-10", -1 → "2026-09" (over the turn of the year too) */
export function shiftMonth(month: string, by: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + by
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** All days of the month, "2026-10-01" … "2026-10-31" */
export function daysOfMonth(month: string): string[] {
  const days: string[] = []
  for (let day = `${month}-01`; monthOf(day) === month; day = addDays(day, 1)) {
    days.push(day)
  }
  return days
}

/** Days from `from` to `date` (negative = before) */
function dayIndex(from: string, date: string): number {
  return Math.round(minutesBetween(`${from}T00:00`, `${date}T00:00`) / (24 * 60))
}

/** An absence as a bar in its person's row, in half days from the first day shown (morning) */
export interface AbsenceBar {
  absence: Absence
  start: number
  end: number
  /** begins before / goes on after the days shown (no rounded corner there) */
  continuesBefore: boolean
  continuesAfter: boolean
}

/**
 * The bars of the days [from, from + days): the first day counts from noon if it starts in the
 * afternoon, the last day up to noon if it ends at noon. Absences outside are left out.
 */
export function barsOf(absences: Absence[], from: string, days: number): AbsenceBar[] {
  const total = days * 2
  const bars: AbsenceBar[] = []
  for (const absence of absences) {
    const start = dayIndex(from, absence.startDate) * 2 + (absence.startsAfternoon ? 1 : 0)
    const end = dayIndex(from, absence.endDate) * 2 + (absence.endsNoon ? 1 : 2)
    if (end <= 0 || start >= total) continue
    bars.push({
      absence,
      start: Math.max(start, 0),
      end: Math.min(end, total),
      continuesBefore: start < 0,
      continuesAfter: end > total,
    })
  }
  return bars.sort((a, b) => a.start - b.start)
}

/** Days dragged open → first and last day in the right order (dragging to the left works too) */
export function selectedDays(dayA: string, dayB: string): { startDate: string; endDate: string } {
  return dayA <= dayB ? { startDate: dayA, endDate: dayB } : { startDate: dayB, endDate: dayA }
}

/** Would the half days [start, end) overlap a bar of the row? – the same rule as the server, for the red outline */
export function overlapsAny(bars: AbsenceBar[], start: number, end: number): boolean {
  return bars.some((bar) => bar.start < end && start < bar.end)
}

/**
 * Is it the person's birthday? Same day and month; born on 29 February → 28 February in years
 * without it (otherwise the birthday would be missing three years out of four).
 */
export function isBirthday(birthday: string | null | undefined, date: string): boolean {
  if (!birthday) return false
  const born = birthday.slice(5)
  const day = date.slice(5)
  if (born === day) return true
  return born === '02-29' && day === '02-28' && addDays(date, 1).slice(5) === '03-01'
}
