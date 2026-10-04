import { addDays } from '../../lib/format'
import type { Vehicle } from './vehicleApi'

/** From this many days before the estimated date, the wizard says "bald fällig". */
export const MFK_SOON_DAYS = 60

export type MfkState =
  | { kind: 'unknown' }
  | { kind: 'overdue' | 'soon' | 'ok'; due: string }

/**
 * How the next MFK looks from today. The date is an ESTIMATE from the backend (4-3-2-2 rule).
 *
 * Without a known last inspection, an estimate in the past says nothing (the car simply has no
 * data) → "unknown" instead of a false alarm.
 */
export function mfkState(vehicle: Pick<Vehicle, 'lastMfk' | 'nextMfk'>, today: string): MfkState {
  const due = vehicle.nextMfk
  if (!due) return { kind: 'unknown' }
  if (due < today) {
    return vehicle.lastMfk ? { kind: 'overdue', due } : { kind: 'unknown' }
  }
  if (due <= addDays(today, MFK_SOON_DAYS)) return { kind: 'soon', due }
  return { kind: 'ok', due }
}
