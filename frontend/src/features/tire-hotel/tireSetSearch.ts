import { matchesAll, searchWords } from '../../lib/search'
import { KINDS, SEASONS, type TireSet } from './tireHotelApi'

/**
 * The search of the tyre hotel: every word must occur in customer, plate, vehicle, tyres, place,
 * season or kind (UX M-18: "winter A3" finds the winter sets on shelf A3) – folded like every search
 * of the app ("ZH-123" = "ZH 123", "Boesch" = "Bösch"). In the browser: a few hundred sets.
 */
export function searchTireSets(sets: TireSet[], query: string): TireSet[] {
  const words = searchWords(query)
  if (words.length === 0) return sets
  return sets.filter((set) => {
    const plate = set.vehicle?.licensePlate ?? ''
    return matchesAll(words, [
      set.customer.displayName,
      plate,
      plate.replace(/\s/g, ''),
      set.vehicle?.description,
      set.brand,
      set.model,
      set.dimension,
      set.place,
      set.place?.replace(/\s/g, ''),
      SEASONS[set.season],
      KINDS[set.kind],
    ])
  })
}
