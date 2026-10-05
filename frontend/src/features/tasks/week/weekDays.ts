import { isWeekend } from '../../../lib/calendar'
import { addDays } from '../../../lib/format'
import type { Task } from '../taskApi'

export interface WeekDay {
  date: string
  tasks: Task[]
}

/**
 * The days of a week: Monday to Friday always, Saturday and Sunday only when there are tasks
 * (like the capacity overview). Within a day by time.
 */
export function weekDays(monday: string, tasks: Task[]): WeekDay[] {
  const byDate = new Map<string, Task[]>()
  for (const task of tasks) {
    byDate.set(task.date, [...(byDate.get(task.date) ?? []), task])
  }
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    .filter((date) => !isWeekend(date) || byDate.has(date))
    .map((date) => ({
      date,
      tasks: [...(byDate.get(date) ?? [])].sort((a, b) => a.time.localeCompare(b.time)),
    }))
}
