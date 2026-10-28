import type { TireSet } from '../../tire-hotel/tireHotelApi'
import type { AnyTask, TireChangeKind } from '../taskApi'
import { openTasksOfVehicle } from './sameVehicle'

/** "Termin abmachen" for a set (FB-18): the wizard with its customer, vehicle and tyre change filled in */
export function tireAppointmentUrl(setId: string): string {
  return `/tasks/new?tireSet=${encodeURIComponent(setId)}`
}

/**
 * Which tyre change the set means: from the hotel it is "eingelagert", lying at the customer's it
 * is "mitgebracht". On the car it is the set coming off – which one goes on is still open.
 */
export function tireChangeKindOf(set: Pick<TireSet, 'state' | 'kind'>): TireChangeKind | '' {
  if (set.state === 'IN_HOTEL') return set.kind === 'WHEELS' ? 'WHEELS_STORED' : 'TIRES_STORED'
  if (set.state === 'WITH_CUSTOMER') return set.kind === 'WHEELS' ? 'WHEELS_BROUGHT' : 'TIRES_BROUGHT'
  return ''
}

/**
 * New tyres (FB-25): the dimension of the car's tyres – the set on the car first (new tyres mostly
 * replace it), else the one used last. '' when none is known; the rims may differ, so it stays a proposal.
 */
export function proposedDimension(sets: readonly Pick<TireSet, 'state' | 'dimension'>[]): string {
  // newest first, as the server sends them
  const known = sets.filter((s) => s.dimension)
  return (known.find((s) => s.state === 'MOUNTED') ?? known.find((s) => s.state !== 'DISPOSED') ?? known[0])?.dimension ?? ''
}

/**
 * The open tyre changes of a vehicle the wizard does not show yet (FB-18): the hint "schon einen
 * offenen Auftrag" lists the chosen day and the tasks without appointment; a tyre change already
 * planned for another week would go unnoticed.
 */
export function openTireChangesElsewhere(tasks: readonly AnyTask[], vehicleId: string | undefined, date: string, exceptTaskId?: string): AnyTask[] {
  return openTasksOfVehicle(tasks, vehicleId, exceptTaskId).filter((task) => task.tireChange && task.date !== null && task.date !== date)
}
