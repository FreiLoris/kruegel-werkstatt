import { describe, expect, it } from 'vitest'
import type { TaskTires, TireSet } from './tireHotelApi'
import { bookingErrors, hasErrors, initialBooking, setSummary, sheetTires, swapPlace, toBookingRequest } from './taskTires'

// fictitious
function set(id: string, more: Partial<TireSet> = {}): TireSet {
  return {
    id,
    season: 'WINTER',
    kind: 'WHEELS',
    rims: null,
    brand: null,
    model: null,
    dimension: null,
    year: null,
    depths: { frontLeft: null, frontRight: null, rearLeft: null, rearRight: null },
    placeId: null,
    place: null,
    retrievedOn: null,
    ...more,
  } as TireSet
}

const winter = set('w', { brand: 'Muster', model: 'Snow 2', dimension: '205/55 R16', year: 2022, rims: 'ALU', placeId: 'p1', place: 'OG-A1-1' })
const summer = set('s', { season: 'SUMMER', kind: 'TIRES', retrievedOn: '2026-04-02' })
const tires = (more: Partial<TaskTires> = {}): TaskTires => ({ mounted: null, removed: null, inHotel: [winter], retrieved: [summer], ...more })

describe('setSummary', () => {
  it('a set in one line, without what is unknown', () => {
    expect(setSummary(winter)).toBe('Winter · Kompletträder Alu · Muster Snow 2 · 205/55 R16 · 2022')
    expect(setSummary(summer)).toBe('Sommer · Nur Reifen')
  })
})

describe('sheetTires', () => {
  it('from the hotel: its set goes on, the one retrieved last comes off', () => {
    expect(sheetTires(tires(), true)).toEqual({ mount: winter, moreInHotel: [], takeOff: summer })
  })

  it('brought by the customer: nothing from the hotel', () => {
    expect(sheetTires(tires(), false).mount).toBeUndefined()
  })

  it('a set retrieved of the same season is not the one on the car', () => {
    const oldWinter = set('ow', { retrievedOn: '2025-04-01' })
    expect(sheetTires(tires({ retrieved: [oldWinter] }), true).takeOff).toBeUndefined()
  })

  it('once booked, the booked sets', () => {
    const booked = tires({ mounted: { ...winter, retrievedOn: '2026-10-15' }, removed: summer, inHotel: [summer], retrieved: [winter] })
    expect(sheetTires(booked, true)).toMatchObject({ mount: { id: 'w' }, takeOff: { id: 's' } })
  })
})

describe('booking', () => {
  const today = '2026-10-15'

  it('proposes the swap: winter on, summer stored again on its place', () => {
    const form = initialBooking(tires(), true, today)
    expect(form.mountedId).toBe('w')
    expect(form.removedChoice).toBe('s')
    expect(swapPlace(form, tires())).toBe('p1')
    expect(toBookingRequest(form, 'p1')).toEqual({
      mounted: { setId: 'w', depths: { frontLeft: undefined, frontRight: undefined, rearLeft: undefined, rearRight: undefined } },
      removed: { setId: 's', depths: { frontLeft: undefined, frontRight: undefined, rearLeft: undefined, rearRight: undefined }, placeId: 'p1' },
    })
  })

  it('without an earlier set a new one, of the other season', () => {
    const form = initialBooking(tires({ retrieved: [] }), true, today)
    expect(form.removedChoice).toBe('new')
    expect(form.removed.season).toBe('SUMMER')
    // a new set needs its kind
    expect(bookingErrors(form, today).removed.kind).toBeTruthy()
    expect(hasErrors(bookingErrors({ ...form, removed: { ...form.removed, kind: 'TIRES' } }, today))).toBe(false)
  })

  it('a set stored again needs only valid depths', () => {
    const form = initialBooking(tires(), true, today)
    expect(hasErrors(bookingErrors(form, today))).toBe(false)
    const typo = { ...form, removed: { ...form.removed, depths: { ...form.removed.depths, frontLeft: 'x' } } }
    expect(bookingErrors(typo, today).removed.frontLeft).toBeTruthy()
  })
})
