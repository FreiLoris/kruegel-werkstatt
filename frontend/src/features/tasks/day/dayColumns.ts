import type { Lift } from '../../lifts/liftApi'
import type { Task } from '../taskApi'

/** Column id of tasks without lift */
export const NO_LIFT = 'no-lift'

export interface DayColumn {
  /** lift id, or {@link NO_LIFT} */
  id: string
  liftId: string | null
  title: string
  tasks: Task[]
}

/**
 * The columns of a day: every active lift in its order, a lift out of service only if it still
 * has tasks that day, and "Ohne Lift" last – always there, so a card can be put there.
 * Within a column the manual order (sortOrder) counts, not the time.
 */
export function dayColumns(tasks: Task[], lifts: Lift[]): DayColumn[] {
  const byColumn = new Map<string, Task[]>()
  for (const task of tasks) {
    const id = task.liftId ?? NO_LIFT
    byColumn.set(id, [...(byColumn.get(id) ?? []), task])
  }
  const sorted = (id: string) =>
    [...(byColumn.get(id) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.time.localeCompare(b.time))

  const liftColumns = lifts
    .filter((lift) => lift.active || byColumn.has(lift.id))
    .map((lift) => ({ id: lift.id, liftId: lift.id, title: lift.active ? lift.name : `${lift.name} (ausser Betrieb)`, tasks: sorted(lift.id) }))
  return [...liftColumns, { id: NO_LIFT, liftId: null, title: 'Ohne Lift', tasks: sorted(NO_LIFT) }]
}

/** Task ids per column – the arrangement that drag & drop changes. */
export type Arrangement = Record<string, string[]>

export function arrangementOf(columns: DayColumn[]): Arrangement {
  return Object.fromEntries(columns.map((column) => [column.id, column.tasks.map((task) => task.id)]))
}

/** Which column holds the task (or `undefined`). */
export function columnOf(arrangement: Arrangement, taskId: string): string | undefined {
  return Object.keys(arrangement).find((column) => arrangement[column].includes(taskId))
}

/** The task moved into a column at an index – a new object, the old one stays untouched. */
export function moveTask(arrangement: Arrangement, taskId: string, toColumn: string, toIndex: number): Arrangement {
  const next: Arrangement = Object.fromEntries(
    Object.entries(arrangement).map(([column, ids]) => [column, ids.filter((id) => id !== taskId)]),
  )
  const target = next[toColumn] ?? []
  next[toColumn] = [...target.slice(0, toIndex), taskId, ...target.slice(toIndex)]
  return next
}

/** The tasks with lift and position as in the arrangement – what the day looks like after a move. */
export function applyArrangement(tasks: Task[], arrangement: Arrangement): Task[] {
  const placed = new Map<string, { liftId: string | null; sortOrder: number }>()
  for (const [column, ids] of Object.entries(arrangement)) {
    ids.forEach((id, index) => placed.set(id, { liftId: column === NO_LIFT ? null : column, sortOrder: index }))
  }
  return tasks.map((task) => ({ ...task, ...placed.get(task.id) }))
}
