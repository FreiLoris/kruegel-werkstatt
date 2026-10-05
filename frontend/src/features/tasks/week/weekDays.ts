import { isWeekend } from '../../../lib/calendar'
import { addDays, minutesBetween } from '../../../lib/format'
import type { Task } from '../taskApi'

export interface WeekDay {
  date: string
  tasks: Task[]
}

/**
 * The days of a week: Monday to Friday always, Saturday and Sunday only when there are tasks
 * (like the capacity overview). Within a day by time; same time → lift order.
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
      tasks: [...(byDate.get(date) ?? [])].sort((a, b) => a.time.localeCompare(b.time) || a.sortOrder - b.sortOrder),
    }))
}

/**
 * The tasks after moving one of them to another day – shown right away while the server saves.
 * End, "kommt früher" and "fertig bis" move by the same number of days, like on the server.
 */
export function withDate(tasks: Task[], taskId: string, date: string): Task[] {
  return tasks.map((task) => {
    if (task.id !== taskId) return task
    const days = minutesBetween(`${task.date}T00:00`, `${date}T00:00`) / MINUTES_PER_DAY
    const shift = (dateTime: string) => `${addDays(dateTime.slice(0, 10), days)}${dateTime.slice(10)}`
    return {
      ...task,
      date,
      endAt: shift(task.endAt),
      arrivesEarlier: task.arrivesEarlier && shift(task.arrivesEarlier),
      readyBy: task.readyBy && shift(task.readyBy),
    }
  })
}

const MINUTES_PER_DAY = 24 * 60
