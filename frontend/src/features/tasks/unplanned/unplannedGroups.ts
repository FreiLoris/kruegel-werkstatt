import type { AnyTask } from '../taskApi'

/**
 * "Ohne Termin" in two groups (FB-15): orders waiting for parts – without a day, or their day over –
 * and the others not planned yet. Pure, tested.
 */
export interface UnplannedGroups {
  /** the parts arrived first: they can be planned now; then the longest waiting */
  waitingForParts: AnyTask[]
  /** the one waiting longest first, as delivered */
  withoutAppointment: AnyTask[]
}

/** Waiting, and the parts are here – it can be planned now */
export const partsArrived = (task: AnyTask) => task.status === 'WAITING_FOR_PARTS' && task.parts?.status === 'ARRIVED'

export function unplannedGroups(withoutAppointment: AnyTask[], waitingSinceTheirDay: AnyTask[]): UnplannedGroups {
  const waiting = (task: AnyTask) => task.status === 'WAITING_FOR_PARTS'
  const arrived = (task: AnyTask) => (partsArrived(task) ? 0 : 1)
  // without a day they wait since they were taken, else since their day
  const since = (task: AnyTask) => task.date ?? task.createdAt.slice(0, 10)
  const waitingForParts = [...withoutAppointment.filter(waiting), ...waitingSinceTheirDay].sort(
    (a, b) => arrived(a) - arrived(b) || since(a).localeCompare(since(b)),
  )
  return { waitingForParts, withoutAppointment: withoutAppointment.filter((task) => !waiting(task)) }
}

/** How many orders wait in both groups together */
export const unplannedTotal = (groups: UnplannedGroups) => groups.waitingForParts.length + groups.withoutAppointment.length

/** "2 ohne Termin · 1 wartet auf Material" – '' when nothing waits */
export function unplannedCount({ waitingForParts, withoutAppointment }: UnplannedGroups): string {
  return [
    withoutAppointment.length > 0 && `${withoutAppointment.length} ohne Termin`,
    waitingForParts.length > 0 && `${waitingForParts.length} wartet auf Material`,
  ]
    .filter(Boolean)
    .join(' · ')
}
