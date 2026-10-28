import { isClosed, type ShoppingItem } from '../shopping/shoppingApi'
import type { AnyTask } from './taskApi'

// New tyres ordered for a task (FB-25): still missing? Pure, tested.

/** The position the server puts on the shopping list for new tyres starts so (ShoppingService.NEW_TIRES_PREFIX) */
const NEW_TIRES_PREFIX = 'Reifen '

/** A tyre position neither arrived nor cancelled */
const isOpenTirePosition = (item: Pick<ShoppingItem, 'description' | 'status'>) =>
  item.description.startsWith(NEW_TIRES_PREFIX) && !isClosed(item.status)

/** The tyres of the task are not here yet */
export const tiresNotDelivered = (items: Pick<ShoppingItem, 'description' | 'status'>[]) => items.some(isOpenTirePosition)

/**
 * The tasks that mount new tyres and are not done – only theirs need the shopping list. A done task
 * says nothing any more, even if nobody marked the tyres arrived.
 */
export const newTiresTaskIds = (tasks: readonly Pick<AnyTask, 'id' | 'tireChangeKind' | 'status'>[]) =>
  tasks.filter((task) => task.tireChangeKind === 'NEW_TIRES' && task.status !== 'DONE').map((task) => task.id)

/** The tasks whose tyres are still missing – from all positions of the tasks */
export const tasksWaitingForTires = (items: Pick<ShoppingItem, 'description' | 'status' | 'task'>[]) =>
  new Set(items.flatMap((item) => (item.task && isOpenTirePosition(item) ? [item.task.id] : [])))
