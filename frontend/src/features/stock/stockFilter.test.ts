import { describe, expect, it } from 'vitest'
import type { StockItem } from './stockApi'
import { filterStock, NONE, sortStock, type StockLookup } from './stockFilter'

// fictitious
const item = (name: string, extra: Partial<StockItem> = {}) =>
  ({
    id: name,
    name,
    category: 'SPARE_PART',
    articleNumber: null,
    manufacturer: null,
    quantity: null,
    storageLocationId: null,
    remark: null,
    suppliers: [],
    ...extra,
  }) as StockItem

const shelfA = 'a'
const shelfB = 'b'
const lookup: StockLookup = {
  locationNames: new Map([
    [shelfA, 'Keller'],
    [shelfB, 'Büro › Regal B'],
    ['office', 'Büro'],
  ]),
  locationsWithin: new Map([
    [shelfA, new Set([shelfA])],
    [shelfB, new Set([shelfB])],
    ['office', new Set(['office', shelfB])],
  ]),
  locationOrder: new Map([
    [shelfA, 0],
    [shelfB, 1],
  ]),
  supplierNames: new Map([
    ['m', 'Muster Teile AG'],
    ['x', 'Beispiel Handel'],
  ]),
}
const all = [
  item('Ölfilter', { remark: 'für VW', quantity: 4, storageLocationId: shelfB, suppliers: [{ supplierId: 'm', articleNumber: 'MT-77' }] }),
  item('Bremsreiniger', {
    category: 'CONSUMABLE',
    quantity: 12,
    storageLocationId: shelfA,
    suppliers: [
      { supplierId: 'x', articleNumber: null },
      { supplierId: 'm', articleNumber: null },
    ],
  }),
  item('Drehmomentschlüssel', { category: 'TOOL', manufacturer: 'Hazet' }),
]
const nothing = { query: '', category: '', location: '', supplier: '' } as const
const names = (items: StockItem[]) => items.map((i) => i.name)

describe('filterStock', () => {
  it('searches all fields, every word must match', () => {
    expect(names(filterStock(all, { ...nothing, query: 'filter vw' }, lookup))).toEqual(['Ölfilter'])
    expect(names(filterStock(all, { ...nothing, query: 'hazet' }, lookup))).toEqual(['Drehmomentschlüssel'])
    // the names of place, category and supplier count too, and the supplier's article number
    expect(names(filterStock(all, { ...nothing, query: 'keller' }, lookup))).toEqual(['Bremsreiniger'])
    expect(names(filterStock(all, { ...nothing, query: 'werkzeug' }, lookup))).toEqual(['Drehmomentschlüssel'])
    expect(names(filterStock(all, { ...nothing, query: 'beispiel' }, lookup))).toEqual(['Bremsreiniger'])
    expect(names(filterStock(all, { ...nothing, query: 'mt-77' }, lookup))).toEqual(['Ölfilter'])
  })

  it('filters by category and place, also "without place"', () => {
    expect(names(filterStock(all, { ...nothing, category: 'CONSUMABLE' }, lookup))).toEqual(['Bremsreiniger'])
    expect(names(filterStock(all, { ...nothing, location: shelfB }, lookup))).toEqual(['Ölfilter'])
    expect(names(filterStock(all, { ...nothing, location: NONE }, lookup))).toEqual(['Drehmomentschlüssel'])
  })

  it('a place includes everything inside it – and the search finds the room of a shelf', () => {
    expect(names(filterStock(all, { ...nothing, location: 'office' }, lookup))).toEqual(['Ölfilter'])
    expect(names(filterStock(all, { ...nothing, query: 'büro' }, lookup))).toEqual(['Ölfilter'])
  })

  it('filters by supplier – main or further one – and "without supplier"', () => {
    expect(names(filterStock(all, { ...nothing, supplier: 'm' }, lookup))).toEqual(['Ölfilter', 'Bremsreiniger'])
    expect(names(filterStock(all, { ...nothing, supplier: NONE }, lookup))).toEqual(['Drehmomentschlüssel'])
  })
})

describe('sortStock', () => {
  it('by name with umlauts in place', () => {
    expect(names(sortStock(all, 'name', lookup))).toEqual(['Bremsreiniger', 'Drehmomentschlüssel', 'Ölfilter'])
  })

  it('by place in the order of the settings, without place last', () => {
    expect(names(sortStock(all, 'location', lookup))).toEqual(['Bremsreiniger', 'Ölfilter', 'Drehmomentschlüssel'])
  })

  it('by quantity, not counted last', () => {
    expect(names(sortStock(all, 'quantity', lookup))).toEqual(['Ölfilter', 'Bremsreiniger', 'Drehmomentschlüssel'])
  })

  it('by main supplier, without supplier last', () => {
    expect(names(sortStock(all, 'supplier', lookup))).toEqual(['Bremsreiniger', 'Ölfilter', 'Drehmomentschlüssel'])
  })
})
