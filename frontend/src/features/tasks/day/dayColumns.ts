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
 * Within a column by start (6k: the time grid replaced the manual order).
 */
export function dayColumns(tasks: Task[], lifts: Lift[]): DayColumn[] {
  const byColumn = new Map<string, Task[]>()
  for (const task of tasks) {
    const id = task.liftId ?? NO_LIFT
    byColumn.set(id, [...(byColumn.get(id) ?? []), task])
  }
  const sorted = (id: string) =>
    [...(byColumn.get(id) ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  const liftColumns = lifts
    .filter((lift) => lift.active || byColumn.has(lift.id))
    .map((lift) => ({ id: lift.id, liftId: lift.id, title: lift.active ? lift.name : `${lift.name} (ausser Betrieb)`, tasks: sorted(lift.id) }))
  return [...liftColumns, { id: NO_LIFT, liftId: null, title: 'Ohne Lift', tasks: sorted(NO_LIFT) }]
}
