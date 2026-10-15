import type { TirePlace, TireSet } from './tireHotelApi'

/**
 * The places of the tyre hotel (FB-07, 13n) – which set lies where, which are free, and which one
 * to propose next. Pure functions, tested.
 */

/** place id → the set in the hotel lying there */
export function occupancy(sets: TireSet[]): Map<string, TireSet> {
  return new Map(sets.filter((s) => s.placeId && !s.retrievedOn).map((s) => [s.placeId!, s]))
}

/** The places in use of one location, in order */
export function placesAt(places: TirePlace[], locationId: string): TirePlace[] {
  return places.filter((p) => p.locationId === locationId && p.active)
}

export function freeCount(places: TirePlace[], occupied: ReadonlyMap<string, unknown>): number {
  return places.filter((p) => p.active && !occupied.has(p.id)).length
}

/**
 * The place to propose: the next free one after {@code after} (the place used last), in the order
 * of the places – so a busy day fills one trolley after the other. Wraps around; without
 * {@code after} the first free one.
 */
export function nextFreePlace(places: TirePlace[], occupied: ReadonlyMap<string, unknown>, after?: string | null): TirePlace | undefined {
  const usable = places.filter((p) => p.active)
  const start = after ? usable.findIndex((p) => p.id === after) + 1 : 0
  const ordered = [...usable.slice(start), ...usable.slice(0, start)]
  return ordered.find((p) => !occupied.has(p.id))
}

/** Where the last stored set went – the list comes newest first */
export function lastUsedPlace(sets: TireSet[]): string | null {
  return sets.find((s) => s.placeId)?.placeId ?? null
}

/** 1 → "A", 2 → "B" – the columns of a floor grid */
export const columnLetter = (a: number) => String.fromCharCode(64 + a)

/** "Huber Peter" → "Huber P." – fits on a small place */
export function shortName(displayName: string): string {
  const [first, second] = displayName.split(' ')
  return second ? `${first} ${second[0]}.` : first
}
