/**
 * Central formatting for display. The backend always delivers ISO values,
 * people always see the Swiss format.
 *
 *   Date       "2026-10-15"            → "15.10.2026"
 *   Time       "08:00:00"              → "08:00"
 *   Timestamp  "2026-10-15T06:00:00Z"  → "15.10.2026, 08:00"  (in Swiss time)
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
