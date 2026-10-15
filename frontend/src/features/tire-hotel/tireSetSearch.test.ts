import { describe, expect, it } from 'vitest'
import type { TireSet } from './tireHotelApi'
import { searchTireSets } from './tireSetSearch'

// fictitious
const set = (id: string, name: string, plate: string | null, brand: string | null = null) =>
  ({ id, customer: { displayName: name }, vehicle: plate ? { licensePlate: plate, description: 'VW Golf' } : null, brand, model: null, dimension: null }) as TireSet

const sets = [set('a', 'Huber Peter', 'ZH 123 456', 'Michelin'), set('b', 'Muster AG', 'SG 7890'), set('c', 'Beispiel Anna', null)]

describe('searchTireSets', () => {
  it('every word must occur – customer, plate (with or without spaces), vehicle, tyres', () => {
    expect(searchTireSets(sets, 'huber').map((s) => s.id)).toEqual(['a'])
    expect(searchTireSets(sets, 'zh123456').map((s) => s.id)).toEqual(['a'])
    expect(searchTireSets(sets, 'golf michelin').map((s) => s.id)).toEqual(['a'])
    expect(searchTireSets(sets, 'golf').map((s) => s.id)).toEqual(['a', 'b'])
    expect(searchTireSets(sets, 'huber muster')).toEqual([])
  })

  it('nothing typed: all', () => {
    expect(searchTireSets(sets, '  ')).toHaveLength(3)
  })
})
