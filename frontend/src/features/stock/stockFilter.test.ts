import { describe, expect, it } from 'vitest'
import type { StockItem } from './stockApi'
import { filterStock, NO_LOCATION, sortStock } from './stockFilter'

// fictitious
const item = (name: string, extra: Partial<StockItem> = {}) =>
  ({ id: name, name, category: 'SPARE_PART', articleNumber: null, manufacturer: null, quantity: null, storageLocationId: null, remark: null, ...extra }) as StockItem

const shelfA = 'a'
const shelfB = 'b'
const names = new Map([
  [shelfA, 'Keller'],
  [shelfB, 'Regal B'],
])
const all = [
  item('Ölfilter', { remark: 'für VW', quantity: 4, storageLocationId: shelfB }),
  item('Bremsreiniger', { category: 'CONSUMABLE', quantity: 12, storageLocationId: shelfA }),
  item('Drehmomentschlüssel', { category: 'TOOL', manufacturer: 'Hazet' }),
]
const nothing = { query: '', category: '', location: '' } as const

describe('filterStock', () => {
  it('searches all fields, every word must match', () => {
    expect(filterStock(all, { ...nothing, query: 'filter vw' }, names).map((i) => i.name)).toEqual(['Ölfilter'])
    expect(filterStock(all, { ...nothing, query: 'hazet' }, names).map((i) => i.name)).toEqual(['Drehmomentschlüssel'])
    // the name of the place and of the category count too
    expect(filterStock(all, { ...nothing, query: 'keller' }, names).map((i) => i.name)).toEqual(['Bremsreiniger'])
    expect(filterStock(all, { ...nothing, query: 'werkzeug' }, names).map((i) => i.name)).toEqual(['Drehmomentschlüssel'])
  })

  it('filters by category and place, also "without place"', () => {
    expect(filterStock(all, { ...nothing, category: 'CONSUMABLE' }, names).map((i) => i.name)).toEqual(['Bremsreiniger'])
    expect(filterStock(all, { ...nothing, location: shelfB }, names).map((i) => i.name)).toEqual(['Ölfilter'])
    expect(filterStock(all, { ...nothing, location: NO_LOCATION }, names).map((i) => i.name)).toEqual(['Drehmomentschlüssel'])
  })
})

describe('sortStock', () => {
  const order = new Map([
    [shelfA, 0],
    [shelfB, 1],
  ])

  it('by name with umlauts in place', () => {
    expect(sortStock(all, 'name', order).map((i) => i.name)).toEqual(['Bremsreiniger', 'Drehmomentschlüssel', 'Ölfilter'])
  })

  it('by place in the order of the settings, without place last', () => {
    expect(sortStock(all, 'location', order).map((i) => i.name)).toEqual(['Bremsreiniger', 'Ölfilter', 'Drehmomentschlüssel'])
  })

  it('by quantity, not counted last', () => {
    expect(sortStock(all, 'quantity', order).map((i) => i.name)).toEqual(['Ölfilter', 'Bremsreiniger', 'Drehmomentschlüssel'])
  })
})
