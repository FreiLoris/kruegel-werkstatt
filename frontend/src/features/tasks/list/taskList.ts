import { mondayOf } from '../../../lib/calendar'
import { addDays } from '../../../lib/format'
import type { Employee } from '../../employees/employeeApi'
import type { Lift } from '../../lifts/liftApi'
import type { Task, TaskStatus } from '../taskApi'

/** The backend delivers at most this many days at once */
export const MAX_PERIOD_DAYS = 92

export interface Period {
  from: string
  to: string
}

export interface PeriodPreset extends Period {
  label: string
}

/** Quick periods – "diese Woche" from the UI review, the rest what a workshop asks for. */
export function periodPresets(today: string): PeriodPreset[] {
  const monday = mondayOf(today)
  return [
    { label: 'Heute', from: today, to: today },
    { label: 'Diese Woche', from: monday, to: addDays(monday, 6) },
    { label: 'Nächste 2 Wochen', from: today, to: addDays(today, 13) },
    { label: 'Letzte 30 Tage', from: addDays(today, -30), to: today },
  ]
}

export function periodDays(period: Period): number {
  return Math.round((Date.parse(period.to) - Date.parse(period.from)) / 86_400_000) + 1
}

export interface TaskFilter {
  /** empty = all statuses */
  statuses: TaskStatus[]
  /** '' = all */
  mechanicId: string
  /** words that must all occur in customer, vehicle, task number or work */
  text: string
}

export type SortKey = 'date' | 'customer' | 'vehicle' | 'mechanic' | 'lift' | 'status' | 'taskNumber'
export type SortDirection = 'asc' | 'desc'

/** Status in its natural order (not alphabetical): received → … → done */
const STATUS_ORDER: Record<TaskStatus, number> = { RECEIVED: 0, IN_PROGRESS: 1, WAITING_FOR_PARTS: 2, DONE: 3 }

export function filterTasks(tasks: Task[], filter: TaskFilter, workOf: (task: Task) => string): Task[] {
  const words = filter.text.toLowerCase().split(/\s+/).filter(Boolean)
  return tasks.filter((task) => {
    if (filter.statuses.length > 0 && !filter.statuses.includes(task.status)) return false
    if (filter.mechanicId && task.mechanicId !== filter.mechanicId) return false
    if (words.length === 0) return true
    const plate = task.vehicle?.licensePlate ?? ''
    const haystack = [task.customer.displayName, plate, plate.replace(/\s/g, ''), task.vehicle?.description, task.taskNumber, workOf(task)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

/**
 * Sorted copy. Empty values (no mechanic, no task number …) always go last, in both directions –
 * "open" things should not hide at the top.
 */
export function sortTasks(
  tasks: Task[],
  key: SortKey,
  direction: SortDirection,
  lookups: { employees: Employee[]; lifts: Lift[] },
): Task[] {
  const valueOf = (task: Task): string | number | null => {
    switch (key) {
      case 'date':
        return `${task.date} ${task.time}`
      case 'customer':
        return task.customer.displayName.toLowerCase()
      case 'vehicle':
        return task.vehicle?.licensePlate ?? task.vehicle?.description ?? null
      case 'mechanic':
        return lookups.employees.find((e) => e.id === task.mechanicId)?.name.toLowerCase() ?? null
      case 'lift':
        return lookups.lifts.find((l) => l.id === task.liftId)?.sortOrder ?? null
      case 'status':
        return STATUS_ORDER[task.status]
      case 'taskNumber':
        return task.taskNumber
    }
  }
  const sign = direction === 'asc' ? 1 : -1
  return [...tasks].sort((a, b) => {
    const va = valueOf(a)
    const vb = valueOf(b)
    if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1
    const order = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'de')
    // same value → by appointment, so the list stays stable and readable
    return sign * order || `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  })
}
