import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { formatDate, formatTime } from '../../lib/format'

/**
 * A date-time seen from the day of the appointment: only the time on the same day ("16:30"),
 * otherwise with the day ("Fr 16.10. 12:00") – short enough for cards.
 */
export function timeSeenFrom(appointmentDate: string, dateTime: string): string {
  const [day, time] = dateTime.split('T')
  return day === appointmentDate ? formatTime(time) : `${WEEKDAYS_SHORT[weekdayOf(day)]} ${formatDate(day).slice(0, 6)} ${formatTime(time)}`
}

/** Start to end of an appointment: "08:00–09:30", or "08:00 – Fr 16.10. 12:00" over several days. */
export function timeRange(date: string, time: string, endAt: string): string {
  const end = timeSeenFrom(date, endAt)
  return endAt.startsWith(date) ? `${formatTime(time)}–${end}` : `${formatTime(time)} – ${end}`
}
