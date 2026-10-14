import { CATEGORY_LABEL, type StockCategory, type StockItem } from './stockApi'

/** Location or supplier filter "articles without one" */
export const NONE = 'none'

export type StockSort = 'name' | 'category' | 'quantity' | 'location' | 'supplier'

export interface StockFilter {
  /** Search text – every word must appear in one of the fields */
  query: string
  /** empty = all */
  category: StockCategory | ''
  /** a storage location ID, {@link NONE} or empty (all) */
  location: string
  /** a supplier ID (main or further one), {@link NONE} or empty (all) */
  supplier: string
}

/** Names and order of places and suppliers – the article only has their IDs */
export interface StockLookup {
  locationNames: Map<string, string>
  /** position in the settings (along the shelves) */
  locationOrder: Map<string, number>
  supplierNames: Map<string, string>
}

/** What the search looks through – the visible texts, including the names of category, place and suppliers */
function searchText(item: StockItem, lookup: StockLookup) {
  return [
    item.name,
    CATEGORY_LABEL[item.category],
    item.articleNumber,
    item.manufacturer,
    item.storageLocationId && lookup.locationNames.get(item.storageLocationId),
    item.remark,
    ...item.suppliers.flatMap((s) => [lookup.supplierNames.get(s.supplierId), s.articleNumber]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('de-CH')
}

function matches(filter: string, ids: string[]) {
  if (!filter) return true
  return filter === NONE ? ids.length === 0 : ids.includes(filter)
}

/**
 * Search over all fields (FB-08), filters for category, place and supplier (FB-09). Several words
 * narrow down: "filter vw" finds "Ölfilter" with the remark "für VW".
 */
export function filterStock(items: StockItem[], filter: StockFilter, lookup: StockLookup): StockItem[] {
  const words = filter.query.toLocaleLowerCase('de-CH').split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (filter.category && item.category !== filter.category) return false
    if (!matches(filter.location, item.storageLocationId ? [item.storageLocationId] : [])) return false
    if (!matches(filter.supplier, item.suppliers.map((s) => s.supplierId))) return false
    if (words.length === 0) return true
    const text = searchText(item, lookup)
    return words.every((word) => text.includes(word))
  })
}

const compareText = (a: string, b: string) => a.localeCompare(b, 'de-CH', { sensitivity: 'base', numeric: true })
const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL) as StockCategory[]

/**
 * Sorted by the chosen column, then by name. Places in the order of the settings (along the shelves,
 * for an inventory), suppliers by the name of the main one – articles without place, quantity or
 * supplier last.
 */
export function sortStock(items: StockItem[], sort: StockSort, lookup: StockLookup): StockItem[] {
  const last = Number.MAX_SAFE_INTEGER
  const mainSupplier = (item: StockItem) => (item.suppliers[0] ? (lookup.supplierNames.get(item.suppliers[0].supplierId) ?? '') : null)
  const compare: Record<StockSort, (a: StockItem, b: StockItem) => number> = {
    name: () => 0,
    category: (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    quantity: (a, b) => (a.quantity ?? last) - (b.quantity ?? last),
    location: (a, b) => {
      const place = (item: StockItem) => (item.storageLocationId ? (lookup.locationOrder.get(item.storageLocationId) ?? last) : last)
      return place(a) - place(b)
    },
    supplier: (a, b) => {
      const [x, y] = [mainSupplier(a), mainSupplier(b)]
      if (x === null || y === null) return (x === null ? 1 : 0) - (y === null ? 1 : 0)
      return compareText(x, y)
    },
  }
  return [...items].sort((a, b) => compare[sort](a, b) || compareText(a.name, b.name))
}
