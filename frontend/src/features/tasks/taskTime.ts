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

/** What stands in place of a clock time that is not agreed yet (12d-2) */
export const TIME_OPEN = 'Zeit offen'

/** What a task needs to say when it is */
interface Timed {
  date: string
  time: string
  timeOpen: boolean
}

/** The start as people read it: "08:00" – or "Zeit offen" (`open` for a shorter word in narrow rows). */
export function startLabel(task: Omit<Timed, 'date'>, open: string = TIME_OPEN): string {
  return task.timeOpen ? open : formatTime(task.time)
}

/**
 * Start to end as people read it: "08:00–09:30" – or "Zeit offen". The times of such a task only
 * reserve its lift; shown as a time they would look like a promise to the customer.
 */
export function periodLabel(task: Timed & { endAt: string }): string {
  return task.timeOpen ? TIME_OPEN : timeRange(task.date, task.time, task.endAt)
}

/** Start to end of an appointment: "08:00–09:30", or "08:00 – Fr 16.10. 12:00" over several days. */
export function timeRange(date: string, time: string, endAt: string): string {
  const end = timeSeenFrom(date, endAt)
  return endAt.startsWith(date) ? `${formatTime(time)}–${end}` : `${formatTime(time)} – ${end}`
}
