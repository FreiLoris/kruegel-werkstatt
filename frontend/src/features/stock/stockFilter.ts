import { CATEGORY_LABEL, type StockCategory, type StockItem } from './stockApi'

/** Location filter "articles without a fixed place" */
export const NO_LOCATION = 'none'

export type StockSort = 'name' | 'category' | 'quantity' | 'location'

export interface StockFilter {
  /** Search text – every word must appear in one of the fields */
  query: string
  /** empty = all */
  category: StockCategory | ''
  /** a storage location ID, {@link NO_LOCATION} or empty (all) */
  location: string
}

/** What the search looks through – the visible texts, including the names of category and place */
function searchText(item: StockItem, locationName: string | undefined) {
  return [item.name, CATEGORY_LABEL[item.category], item.articleNumber, item.manufacturer, locationName, item.remark]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('de-CH')
}

/**
 * Search over all fields (FB-08), filters for category and place. Several words narrow down:
 * "filter vw" finds "Ölfilter" with the remark "für VW".
 */
export function filterStock(items: StockItem[], filter: StockFilter, locationNames: Map<string, string>): StockItem[] {
  const words = filter.query.toLocaleLowerCase('de-CH').split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (filter.category && item.category !== filter.category) return false
    if (filter.location === NO_LOCATION ? item.storageLocationId !== null : filter.location && item.storageLocationId !== filter.location) {
      return false
    }
    if (words.length === 0) return true
    const text = searchText(item, item.storageLocationId ? locationNames.get(item.storageLocationId) : undefined)
    return words.every((word) => text.includes(word))
  })
}

const byName = (a: StockItem, b: StockItem) => a.name.localeCompare(b.name, 'de-CH', { sensitivity: 'base', numeric: true })
const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL) as StockCategory[]

/**
 * Sorted by the chosen column, then by name. Places in the order of the settings (along the shelves,
 * for an inventory) – articles without a place and without a quantity last.
 */
export function sortStock(items: StockItem[], sort: StockSort, locationOrder: Map<string, number>): StockItem[] {
  const last = Number.MAX_SAFE_INTEGER
  const key: Record<StockSort, (item: StockItem) => number> = {
    name: () => 0,
    category: (item) => CATEGORY_ORDER.indexOf(item.category),
    quantity: (item) => item.quantity ?? last,
    location: (item) => (item.storageLocationId ? (locationOrder.get(item.storageLocationId) ?? last) : last),
  }
  return [...items].sort((a, b) => key[sort](a) - key[sort](b) || byName(a, b))
}
