import { isClosed, type ShoppingItem } from '../../shopping/shoppingApi'
import { quantityText } from '../../shopping/shoppingText'
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

/** The parts of a task on the shopping list (FB-19) */
export interface TaskParts {
  /** what is not here yet: "2× Bremsscheiben vorne" */
  missing: string[]
  /** it has parts and all of them arrived – it can be planned now */
  arrived: boolean
}

/** Per task: what is missing, and whether all its parts arrived – from all positions of the tasks */
export function partsByTask(items: ShoppingItem[]): Map<string, TaskParts> {
  const parts = new Map<string, TaskParts>()
  for (const item of items) {
    if (!item.task) continue
    const task = parts.get(item.task.id) ?? parts.set(item.task.id, { missing: [], arrived: true }).get(item.task.id)!
    if (!isClosed(item.status)) {
      task.missing.push(quantityText(item))
      task.arrived = false
    }
  }
  return parts
}

export function unplannedGroups(withoutAppointment: AnyTask[], waitingSinceTheirDay: AnyTask[], parts = new Map<string, TaskParts>()): UnplannedGroups {
  const waiting = (task: AnyTask) => task.status === 'WAITING_FOR_PARTS'
  const arrived = (task: AnyTask) => (parts.get(task.id)?.arrived ? 0 : 1)
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

/** Which ones: all, those with the customer (call them in), those here (FB-16) */
export type LocationFilter = 'all' | 'customer' | 'workshop'

export function byLocation(groups: UnplannedGroups, filter: LocationFilter): UnplannedGroups {
  if (filter === 'all') return groups
  const location = filter === 'customer' ? 'AT_CUSTOMER' : 'AT_WORKSHOP'
  const keep = (tasks: AnyTask[]) => tasks.filter((t) => t.vehicleLocation === location)
  return { waitingForParts: keep(groups.waitingForParts), withoutAppointment: keep(groups.withoutAppointment) }
}

/** The filter from the address (`where=customer|workshop`); anything else = all */
export function locationFilterOf(param: string | null): LocationFilter {
  return param === 'customer' || param === 'workshop' ? param : 'all'
}

/**
 * Call the customer in now (FB-16 with FB-15): the parts arrived and the car is with them – the case
 * the workshop wants to see first ("Material da, Fahrzeug beim Kunden"). Only then: marking every
 * order with the car at the customer would mark nearly all.
 */
export function callInNow(task: AnyTask, parts: Map<string, TaskParts>): boolean {
  return task.vehicleLocation === 'AT_CUSTOMER' && parts.get(task.id)?.arrived === true
}
