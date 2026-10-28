import { turnOf, type ShoppingItem, type Turn } from './shoppingApi'

type TaskRef = NonNullable<ShoppingItem['task']>

/** "26-0007 · Muster AG · ZH 123456" – which task a part is for (FB-19: number, customer, plate) */
export function taskLabel(task: TaskRef): string {
  return [task.taskNumber, task.customerName, task.licensePlate].filter(Boolean).join(' · ')
}

/** "2× Bremsscheiben vorne" – the quantity only when more than one */
export function quantityText(item: Pick<ShoppingItem, 'quantity' | 'description'>): string {
  return item.quantity > 1 ? `${item.quantity}× ${item.description}` : item.description
}

/** "3 – wir sind dran · 2 – wartet auf Lieferant" (FB-28) – '' when nothing is open */
export function openSummary(items: ShoppingItem[]): string {
  const ours = items.filter((i) => turnOf(i.status) === 'us').length
  const theirs = items.filter((i) => turnOf(i.status) === 'supplier').length
  return [ours > 0 && `${ours} – wir sind dran`, theirs > 0 && `${theirs} – wartet auf Lieferant`].filter(Boolean).join(' · ')
}

/** Only the positions where we are up – or the supplier (FB-28); 'all' = every one */
export function byTurn<T extends Pick<ShoppingItem, 'status'>>(items: T[], turn: Turn | 'all'): T[] {
  return turn === 'all' ? items : items.filter((i) => turnOf(i.status) === turn)
}

/** Which positions: all, those for a task, those for the workshop (FB-20: filter "mit / ohne Auftrag") */
export type TaskFilter = 'all' | 'task' | 'workshop'

/** The ways of delivery the positions are ordered with (FB-30), sorted – for the filter */
export function deliveriesOf(items: Pick<ShoppingItem, 'delivery'>[]): string[] {
  return [...new Set(items.flatMap((i) => (i.delivery ? [i.delivery] : [])))].sort((a, b) => a.localeCompare(b, 'de'))
}

/** Without a filter for the way of delivery – empty, so the address has no "via" */
export const ALL_DELIVERIES = ''
/** The filter for positions without a way of delivery – a supplier's kind is never just "-" in practice */
export const NO_DELIVERY = '-'

/**
 * The filter from the address – one not in use any more (an old link, the last Nachtexpress
 * arrived) shows all instead of an empty list that looks like "nothing to order"
 */
export const deliveryFilter = (param: string | null, deliveries: string[]) =>
  param === NO_DELIVERY || (param !== null && deliveries.includes(param)) ? param : ALL_DELIVERIES

/** Only the positions ordered with that way of delivery – {@link NO_DELIVERY}: those without one */
export function byDelivery<T extends Pick<ShoppingItem, 'delivery'>>(items: T[], delivery: string): T[] {
  if (delivery === ALL_DELIVERIES) return items
  return items.filter((i) => (delivery === NO_DELIVERY ? !i.delivery : i.delivery === delivery))
}

export function byTask(items: ShoppingItem[], filter: TaskFilter): ShoppingItem[] {
  if (filter === 'all') return items
  return items.filter((i) => (filter === 'task') === (i.task !== null))
}
