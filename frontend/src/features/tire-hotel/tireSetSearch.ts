import type { TireSet } from './tireHotelApi'

/** Letters and digits only, lower case: "ZH 123 456" and "zh123456" find each other */
const squeeze = (text: string) => text.toLowerCase().replace(/[^a-z0-9äöüéèà]/g, '')

/**
 * The search of the tyre hotel: every word must occur in customer, plate, vehicle or tyres – like
 * the other searches of the app. In the browser: the hotel holds a few hundred sets.
 */
export function searchTireSets(sets: TireSet[], query: string): TireSet[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return sets
  return sets.filter((set) => {
    const text = [set.customer.displayName, set.vehicle?.licensePlate, set.vehicle?.description, set.brand, set.model, set.dimension]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const squeezed = squeeze(text)
    return words.every((word) => text.includes(word) || (squeeze(word) !== '' && squeezed.includes(squeeze(word))))
  })
}
