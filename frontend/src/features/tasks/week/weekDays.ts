import { isWeekend } from '../../../lib/calendar'
import { addDays } from '../../../lib/format'
import type { Task } from '../taskApi'

export interface WeekDay {
  date: string
  tasks: Task[]
}

/**
 * The days of a week: Monday to Friday always, Saturday and Sunday only when there are tasks
 * (like the capacity overview) – or other entries on that day, e.g. an MFK appointment (FB-10).
 * Within a day by time.
 */
export function weekDays(monday: string, tasks: Task[], otherDates: string[] = []): WeekDay[] {
  const byDate = new Map<string, Task[]>()
  for (const task of tasks) {
    byDate.set(task.date, [...(byDate.get(task.date) ?? []), task])
  }
  const other = new Set(otherDates)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    .filter((date) => !isWeekend(date) || byDate.has(date) || other.has(date))
    .map((date) => ({
      date,
      tasks: [...(byDate.get(date) ?? [])].sort((a, b) => a.time.localeCompare(b.time)),
    }))
}
