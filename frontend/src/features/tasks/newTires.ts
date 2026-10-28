import { isClosed, type ShoppingItem } from '../shopping/shoppingApi'
import type { AnyTask } from './taskApi'

/**
 * New tyres ordered for a task (FB-25): the position the server puts on the shopping list starts
 * with this (ShoppingService.NEW_TIRES_PREFIX). Pure, tested.
 */
const NEW_TIRES_PREFIX = 'Reifen '

/** The tyres of the task are not here yet – its tyre position is neither arrived nor cancelled */
export const tiresNotDelivered = (items: Pick<ShoppingItem, 'description' | 'status'>[]) =>
  items.some((item) => item.description.startsWith(NEW_TIRES_PREFIX) && !isClosed(item.status))

/** The tasks that mount new tyres – only theirs need the shopping list */
export const newTiresTaskIds = (tasks: readonly Pick<AnyTask, 'id' | 'tireChangeKind'>[]) =>
  tasks.filter((task) => task.tireChangeKind === 'NEW_TIRES').map((task) => task.id)

/** Per task: its tyres are still missing – from all positions of the tasks */
export function tasksWaitingForTires(items: Pick<ShoppingItem, 'description' | 'status' | 'task'>[]): Set<string> {
  return new Set(items.filter((item) => item.task && tiresNotDelivered([item])).map((item) => item.task!.id))
}
