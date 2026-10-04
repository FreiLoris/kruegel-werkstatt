import type { Employee } from '../../features/employees/employeeApi'
import type { DeviceChoice } from '../../lib/devicePerson'

/**
 * What may this device do right now?
 *
 * - `loading`       employee list is still coming
 * - `choose`        the device first has to say who uses it (or "view only")
 * - `person`        person chosen and active → may edit
 * - `viewOnly`      "view only" (workshop TV) → may not edit
 * - `setup`         nobody created yet → nobody selectable, editing allowed (backend likewise)
 * - `unknown`       list could not be loaded (server gone) → do not block, pages show the error
 */
export type DeviceStatus =
  | { kind: 'loading' }
  | { kind: 'choose'; noLongerActive?: string }
  | { kind: 'person'; person: Employee }
  | { kind: 'viewOnly' }
  | { kind: 'setup' }
  | { kind: 'unknown' }

export function deviceStatus(choice: DeviceChoice | null, active: Employee[] | undefined, loadError: boolean): DeviceStatus {
  if (loadError) return { kind: 'unknown' }
  if (!active) return { kind: 'loading' }
  if (active.length === 0) return { kind: 'setup' }
  if (choice?.kind === 'viewOnly') return { kind: 'viewOnly' }
  if (choice?.kind === 'person') {
    const person = active.find((e) => e.id === choice.id)
    // Chosen person was deactivated → choose again (the backend would reject changes otherwise)
    return person ? { kind: 'person', person } : { kind: 'choose', noLongerActive: choice.id }
  }
  return { kind: 'choose' }
}

export function canEdit(status: DeviceStatus): boolean {
  return status.kind === 'person' || status.kind === 'setup'
}
