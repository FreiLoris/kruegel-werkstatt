import { describe, expect, it } from 'vitest'
import type { TirePlace, TireSet } from './tireHotelApi'
import { columnLetter, freeCount, lastUsedPlace, nextFreePlace, occupancy, shortName } from './tirePlaces'

const place = (id: string, active = true) => ({ id, locationId: 'og', active }) as TirePlace
const places = [place('p1'), place('p2'), place('p3', false), place('p4')]
const set = (id: string, placeId: string | null, retrievedOn: string | null = null) => ({ id, placeId, retrievedOn }) as TireSet

describe('places', () => {
  it('who lies where – a retrieved set lies nowhere', () => {
    const taken = occupancy([set('a', 'p1'), set('b', null), set('c', 'p2', '2026-10-01')])
    expect([...taken.keys()]).toEqual(['p1'])
    expect(freeCount(places, taken)).toBe(2)
  })

  it('the next free place after the one used last, wrapping around; places no longer used are skipped', () => {
    const taken = occupancy([set('a', 'p1')])
    expect(nextFreePlace(places, taken)?.id).toBe('p2')
    expect(nextFreePlace(places, taken, 'p2')?.id).toBe('p4')
    expect(nextFreePlace(places, taken, 'p4')?.id).toBe('p2')
    expect(nextFreePlace(places, occupancy([set('a', 'p1'), set('b', 'p2'), set('c', 'p4')]))).toBeUndefined()
  })

  it('the place used last: the newest set with a place', () => {
    expect(lastUsedPlace([set('new', null), set('older', 'p2'), set('oldest', 'p1')])).toBe('p2')
    expect(lastUsedPlace([])).toBeNull()
  })

  it('letters and short names', () => {
    expect(columnLetter(1)).toBe('A')
    expect(columnLetter(6)).toBe('F')
    expect(shortName('Huber Peter')).toBe('Huber P.')
    expect(shortName('Muster')).toBe('Muster')
  })
})
