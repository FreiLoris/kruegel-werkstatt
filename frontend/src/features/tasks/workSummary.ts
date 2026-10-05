import { formatLocalDateTime } from '../../lib/format'
import { PARTS_STATUS, TIRE_CHANGE_KINDS, type Task } from './taskApi'

/** One piece of work, e.g. "Radwechsel" with detail "Räder eingelagert". */
export interface WorkItem {
  label: string
  detail?: string
}

type TaskWork = Pick<Task, 'tireChange' | 'tireChangeKind' | 'mfk' | 'mfkAppointment' | 'serviceItemIds' | 'parts'>

/**
 * Everything ticked on a task, in a fixed order: tire change, MFK, service items (in the order
 * of the service item list), parts. The free text is not included – it is shown separately.
 * F1: the old task sheet only showed the free text.
 *
 * @param serviceItemNames name per service item ID (unknown IDs are left out)
 */
export function workItems(task: TaskWork, serviceItemNames: ReadonlyMap<string, string>): WorkItem[] {
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
  if (task.parts) {
    items.push({
      label: `Material: ${task.parts.description}`,
      detail: [PARTS_STATUS[task.parts.status], task.parts.supplier].filter(Boolean).join(' · '),
    })
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
