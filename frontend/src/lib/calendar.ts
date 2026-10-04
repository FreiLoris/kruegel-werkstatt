import { addDays } from './format'

/**
 * Calendar calculations on ISO dates ("2026-10-15") – as text, calculated in UTC,
 * so no time zone can shift a day.
 */

/** Short weekday names, Monday first (index = {@link weekdayOf}). */
export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

function utc(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/** 0 = Monday … 6 = Sunday */
export function weekdayOf(isoDate: string): number {
  return (utc(isoDate).getUTCDay() + 6) % 7
}

export function isWeekend(isoDate: string): boolean {
  return weekdayOf(isoDate) >= 5
}

/** Monday of the week of the date. */
export function mondayOf(isoDate: string): string {
  return addDays(isoDate, -weekdayOf(isoDate))
}

/** ISO calendar week (week 1 contains the first Thursday of the year). */
export function isoWeek(isoDate: string): number {
  const thursday = utc(addDays(isoDate, 3 - weekdayOf(isoDate)))
  const firstOfYear = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - firstOfYear) / 86_400_000 / 7) + 1
}

/** The last working day before the date – skips weekends and public holidays. */
export function previousWorkingDay(isoDate: string, holidays: ReadonlySet<string>): string {
  let day = addDays(isoDate, -1)
  while (isWeekend(day) || holidays.has(day)) {
    day = addDays(day, -1)
  }
  return day
}

/** The date itself if it is a working day, otherwise the next one. */
export function nextWorkingDay(isoDate: string, holidays: ReadonlySet<string>): string {
  let day = isoDate
  while (isWeekend(day) || holidays.has(day)) {
    day = addDays(day, 1)
  }
  return day
}
