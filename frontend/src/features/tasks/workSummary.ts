import type { Task } from './taskApi'

/**
 * Everything that is done on a task in one line: "Radwechsel · MFK · Ölwechsel · Material: Bremsscheiben · …".
 * Ticked work comes first, then the free text (F1: the old app only showed the free text).
 *
 * @param serviceItemNames name per service item ID (unknown IDs are left out)
 */
export function workSummary(task: Task, serviceItemNames: ReadonlyMap<string, string>): string {
  const parts = [
    task.tireChange ? 'Radwechsel' : null,
    task.mfk ? 'MFK' : null,
    ...task.serviceItemIds.map((id) => serviceItemNames.get(id) ?? null),
    task.parts ? `Material: ${task.parts.description}` : null,
    task.workDescription,
  ]
  return parts.filter((part): part is string => !!part).join(' · ')
}
