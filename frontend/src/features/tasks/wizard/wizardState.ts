import type { Customer, Vehicle } from '../../customers/customerSearchApi'

/**
 * Vehicle choice in step 1: a vehicle, deliberately "still open" (e.g. new car not in
 * SwissGarage yet), or not decided yet.
 */
export type VehicleChoice = { kind: 'vehicle'; vehicle: Vehicle } | { kind: 'open' } | null

export interface CustomerStepValue {
  customer: Customer | null
  vehicle: VehicleChoice
}
