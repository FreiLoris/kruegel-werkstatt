import { turnOf, type ShoppingItem } from './shoppingApi'

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

/** Which positions: all, those for a task, those for the workshop (FB-20: filter "mit / ohne Auftrag") */
export type TaskFilter = 'all' | 'task' | 'workshop'

export function byTask(items: ShoppingItem[], filter: TaskFilter): ShoppingItem[] {
  if (filter === 'all') return items
  return items.filter((i) => (filter === 'task') === (i.task !== null))
}
