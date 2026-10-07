import type { Lift } from '../lifts/liftApi'
import type { Task } from '../tasks/taskApi'

/** Column of tasks without a lift (test drive, diagnosis at the desk, …) */
export const NO_LIFT = 'none'

export interface LiftColumn {
  /** lift ID or {@link NO_LIFT} */
  id: string
  name: string
  tasks: Task[]
}

const byStart = (a: Task, b: Task) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)

/**
 * Today on the dashboard (10b): one column per lift in service, in their order – also when empty
 * ("frei" is information too). A lift taken out of service only appears if it still has a task
 * today, "ohne Lift" only if there is one. Within a column by start.
 */
export function liftColumns(tasks: Task[], lifts: Lift[]): LiftColumn[] {
  const columns: LiftColumn[] = lifts
    .filter((lift) => lift.active || tasks.some((t) => t.liftId === lift.id))
    .map((lift) => ({ id: lift.id, name: lift.name, tasks: tasks.filter((t) => t.liftId === lift.id).sort(byStart) }))
  const known = new Set(lifts.map((l) => l.id))
  const withoutLift = tasks.filter((t) => !t.liftId || !known.has(t.liftId)).sort(byStart)
  return withoutLift.length > 0 ? [...columns, { id: NO_LIFT, name: 'Ohne Lift', tasks: withoutLift }] : columns
}

/** The first appointment after today – for "Keine Termine heute – nächster: …" (UI review) */
export function nextAppointment(tasks: Task[], today: string): Task | undefined {
  return tasks.filter((t) => t.date > today).sort(byStart)[0]
}
