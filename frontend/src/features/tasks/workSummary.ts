import { formatLocalDateTime } from '../../lib/format'
import { SHOPPING_STATUS, type ShoppingItem } from '../shopping/shoppingApi'
import { quantityText } from '../shopping/shoppingText'
import { TIRE_CHANGE_KINDS, type Task } from './taskApi'

/** One piece of work, e.g. "Radwechsel" with detail "Räder eingelagert". */
export interface WorkItem {
  label: string
  detail?: string
}

type TaskWork = Pick<Task, 'tireChange' | 'tireChangeKind' | 'mfk' | 'mfkAppointment' | 'serviceItemIds'>

/**
 * Everything ticked on a task, in a fixed order: tire change, MFK, service items (in the order
 * of the service item list), parts. The free text is not included – it is shown separately.
 * F1: the old task sheet only showed the free text.
 *
 * @param serviceItemNames name per service item ID (unknown IDs are left out)
 * @param parts            its positions of the shopping list (FB-19) – where they are loaded
 */
export function workItems(task: TaskWork, serviceItemNames: ReadonlyMap<string, string>, parts: ShoppingItem[] = []): WorkItem[] {
  const items: WorkItem[] = []
  if (task.tireChange) {
    items.push({ label: 'Radwechsel', detail: task.tireChangeKind ? TIRE_CHANGE_KINDS[task.tireChangeKind] : undefined })
  }
  if (task.mfk) {
    items.push({ label: 'MFK', detail: task.mfkAppointment ? `Termin ${formatLocalDateTime(task.mfkAppointment)}` : undefined })
  }
  for (const id of task.serviceItemIds) {
    const name = serviceItemNames.get(id)
    if (name) items.push({ label: name })
  }
  for (const part of parts) {
    items.push({ label: `Material: ${quantityText(part)}`, detail: partDetail(part) })
  }
  return items
}

/**
 * Everything that is done on a task in one line: "Radwechsel · MFK · Ölwechsel · Material: Bremsscheiben · …".
 * Ticked work first, then the free text.
 */
export function workSummary(task: TaskWork & Pick<Task, 'workDescription'>, serviceItemNames: ReadonlyMap<string, string>): string {
  return [...workItems(task, serviceItemNames).map((item) => item.label), task.workDescription]
    .filter((part): part is string => !!part)
    .join(' · ')
}

/** "bestellt · Nr. 0986479S27" */
function partDetail(part: ShoppingItem): string {
  return [SHOPPING_STATUS[part.status], part.partNumber && `Nr. ${part.partNumber}`].filter(Boolean).join(' · ')
}
