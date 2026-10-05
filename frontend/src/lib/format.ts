/**
 * Central formatting for display. The backend always delivers ISO values,
 * people always see the Swiss format.
 *
 *   Date       "2026-10-15"            → "15.10.2026"
 *   Time       "08:00:00"              → "08:00"
 *   Timestamp  "2026-10-15T06:00:00Z"  → "15.10.2026, 08:00"  (in Swiss time)
 *   Count      1480                    → "1’480"
 *   Month      "2026-03-15"            → "03.2026"
 *   Local      "2026-10-14T18:00:00"   → "14.10.2026, 18:00"  (business date-time, no time zone)
 *
 * Rule: nowhere else in the frontend format date values yourself.
 */

const TIME_ZONE = 'Europe/Zurich'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_TIME = /^(\d{2}):(\d{2})(:\d{2}(\.\d+)?)?$/

const timestampFormat = new Intl.DateTimeFormat('de-CH', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Business date (no time, no time zone).
 *
 * Split as text on purpose instead of `new Date("2026-10-15")`: that would be read as
 * midnight UTC and could be shown as the previous day depending on the time zone.
 */
export function formatDate(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate)
  if (!match) {
    throw new Error(`Not a valid ISO date: "${isoDate}"`)
  }
  const [, year, month, day] = match
  return `${day}.${month}.${year}`
}

/** Business time of day, without seconds. */
export function formatTime(isoTime: string): string {
  const match = ISO_TIME.exec(isoTime)
  if (!match) {
    throw new Error(`Not a valid ISO time: "${isoTime}"`)
  }
  const [, hour, minute] = match
  return `${hour}:${minute}`
}

/** Point in time (e.g. "created at"), converted to Swiss time including daylight saving time. */
export function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Not a valid ISO timestamp: "${isoTimestamp}"`)
  }
  return timestampFormat.format(date)
}

/**
 * Whole number with Swiss thousands separator.
 *
 * Not `toLocaleString('de-CH')`: depending on the ICU version of the browser/Node the separator is
 * a straight or a typographic apostrophe – the display would differ between devices and tests.
 */
export function formatCount(count: number): string {
  return Math.trunc(count)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '’')
}

/** Month of a business date, for estimates such as the next MFK. */
export function formatMonth(isoDate: string): string {
  return formatDate(isoDate).slice(3)
}

const datePartsInZurich = new Intl.DateTimeFormat('de-CH', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Today in Swiss time as ISO date ("2026-10-15") – also correct shortly after midnight.
 * Built from the parts: the formatted text differs between ICU versions (see formatCount).
 */
export function todayIso(now: Date = new Date()): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    datePartsInZurich.formatToParts(now).find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** ISO date plus/minus days, without time zone traps (calculated in UTC). */
export function addDays(isoDate: string, days: number): string {
  const match = ISO_DATE.exec(isoDate)
  if (!match) {
    throw new Error(`Not a valid ISO date: "${isoDate}"`)
  }
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + days))
  return date.toISOString().slice(0, 10)
}

/**
 * Business date-time without time zone ("kommt früher", MFK appointment) – split as text like
 * {@link formatDate}, because it is local time in the workshop, not a point in time.
 */
export function formatLocalDateTime(isoDateTime: string): string {
  const [date, time] = isoDateTime.split('T')
  return `${formatDate(date)}, ${formatTime(time)}`
}
