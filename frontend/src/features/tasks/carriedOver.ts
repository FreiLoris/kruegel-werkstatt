import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addMinutes, formatDate } from '../../lib/format'
import type { Task } from './taskApi'

/**
 * Not finished on its day (FB-14): carried over to the following days, "Ohne Lift" and without a
 * time – computed from its appointment, nothing is moved. Pure, tested.
 */

/** The last day its appointment took – since then it is carried over (an end at 24:00 is still that day) */
export const carriedSince = (task: Pick<Task, 'endAt'>) => addMinutes(task.endAt, -1).slice(0, 10)

/** "verlängert seit Mo 12.10." */
export function carriedLabel(task: Pick<Task, 'endAt'>): string {
  const day = carriedSince(task)
  return `verlängert seit ${WEEKDAYS_SHORT[weekdayOf(day)]} ${formatDate(day).slice(0, 6)}`
}

/** Carried over to a day is only known up to today – a future day does not know what will be finished */
export const showsCarriedOver = (day: string, today: string) => day <= today
