import { addMinutes } from '../../../lib/format'
import type { AnyTask } from '../taskApi'

/**
 * The car at the inspection (FB-10): a hint in the calendars, next to the workshop appointment of
 * its task. It takes nobody's time and no lift (answer of the workshop, 2026-10-14) – it only must
 * not be forgotten.
 */
export interface MfkSlot {
  task: AnyTask
  /** "2026-10-15" */
  date: string
  /** "10:00" */
  start: string
  /** "11:00" – incl. the drive; the end of the day when it would go on into the next */
  end: string
}

/** One hour unless the task says otherwise – like the backend */
const DEFAULT_MINUTES = 60

/** The slots of the tasks whose MFK appointment is known, by time. */
export function mfkSlotsOf(tasks: AnyTask[]): MfkSlot[] {
  return tasks
    .filter((task) => task.mfk && task.mfkAppointment)
    .map((task) => {
      const at = task.mfkAppointment!.slice(0, 16)
      const date = at.slice(0, 10)
      const endAt = addMinutes(at, task.mfkMinutes ?? DEFAULT_MINUTES)
      return { task, date, start: at.slice(11), end: endAt.slice(0, 10) > date ? '24:00' : endAt.slice(11) }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
}

export function mfkSlotsOn(slots: MfkSlot[], date: string): MfkSlot[] {
  return slots.filter((slot) => slot.date === date)
}
