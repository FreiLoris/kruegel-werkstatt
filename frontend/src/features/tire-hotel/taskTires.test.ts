import { describe, expect, it } from 'vitest'
import type { TaskTires, TireSet } from './tireHotelApi'
import { bookingErrors, hasErrors, initialBooking, mountingSummary, setSummary, sheetTires, swapPlace, toBookingRequest, withChoice, withSet } from './taskTires'

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
    storedOn: '2025-10-01',
    state: 'IN_HOTEL',
    retrievedOn: null,
    ...more,
  } as TireSet
}

const winter = set('w', { brand: 'Muster', model: 'Snow 2', dimension: '205/55 R16', year: 2022, rims: 'ALU', placeId: 'p1', place: 'OG-A1-1' })
const summer = set('s', { season: 'SUMMER', kind: 'TIRES', state: 'MOUNTED', retrievedOn: '2026-04-02' })
const tires = (more: Partial<TaskTires> = {}): TaskTires => ({ mounted: null, mountedAs: null, removed: null, removedAs: null, inHotel: [winter], outside: [summer], ...more })

describe('setSummary', () => {
  it('a set in one line, without what is unknown', () => {
    expect(setSummary(winter)).toBe('Winter · Kompletträder Alu · Muster Snow 2 · 205/55 R16 · 2022')
    expect(setSummary(summer)).toBe('Sommer · Nur Reifen')
  })
})

describe('mountingSummary', () => {
  it('torque and pressure as far as known (FB-11)', () => {
    expect(mountingSummary(set('x', { torque: 120, pressureFront: 2.5, pressureRear: 2.7 }))).toBe('120 Nm · Luftdruck v 2,5 / h 2,7 bar')
    expect(mountingSummary(set('x', { pressureRear: 2.7 }))).toBe('Luftdruck v ? / h 2,7 bar')
    expect(mountingSummary(winter)).toBe('')
  })
})

describe('sheetTires', () => {
  it('from the hotel: its set goes on, the one retrieved last comes off', () => {
    expect(sheetTires(tires(), true)).toEqual({ mount: winter, moreInHotel: [], takeOff: summer })
  })

  it('brought by the customer: nothing from the hotel – their own set if known (FB-12)', () => {
    expect(sheetTires(tires(), false).mount).toBeUndefined()
    const own = set('o', { state: 'WITH_CUSTOMER', storedOn: null })
    expect(sheetTires(tires({ outside: [summer, own] }), false)).toMatchObject({ mount: { id: 'o' }, takeOff: { id: 's' } })
  })

  it('a set retrieved of the same season is not the one on the car', () => {
    const oldWinter = set('ow', { state: 'WITH_CUSTOMER', retrievedOn: '2025-04-01' })
    expect(sheetTires(tires({ outside: [oldWinter] }), true).takeOff).toBeUndefined()
  })

  it('once booked, the booked sets', () => {
    const booked = tires({ mounted: { ...winter, retrievedOn: '2026-10-15' }, removed: summer, inHotel: [summer], outside: [winter] })
    expect(sheetTires(booked, true)).toMatchObject({ mount: { id: 'w' }, takeOff: { id: 's' } })
  })
})

describe('booking', () => {
  const today = '2026-10-15'

  it('proposes the swap: winter on, summer stored again on its place', () => {
    const form = initialBooking(tires(), true, today)
    expect(form.mountedChoice).toBe('w')
    expect(form.removedChoice).toBe('s')
    expect(form.removedTo).toBe('hotel')
    expect(swapPlace(form, tires())).toBe('p1')
    expect(toBookingRequest(form, 'p1')).toEqual({
      mounted: { setId: 'w', depths: { frontLeft: undefined, frontRight: undefined, rearLeft: undefined, rearRight: undefined } },
      removed: { setId: 's', depths: { frontLeft: undefined, frontRight: undefined, rearLeft: undefined, rearRight: undefined }, store: true, placeId: 'p1' },
    })
  })

  it('without an earlier set a new one, of the other season', () => {
    const form = initialBooking(tires({ outside: [] }), true, today)
    expect(form.removedChoice).toBe('new')
    expect(form.removed.season).toBe('SUMMER')
    // a new set needs its kind
    expect(bookingErrors(form, today).removed.kind).toBeTruthy()
    expect(hasErrors(bookingErrors({ ...form, removed: { ...form.removed, kind: 'TIRES' } }, today))).toBe(false)
  })

  it('a new set gets torque and pressure of the car proposed (FB-11)', () => {
    const known = { ...winter, torque: 120, pressureFront: 2.5, pressureRear: 2.7 }
    const form = initialBooking(tires({ inHotel: [known], outside: [] }), true, today)
    expect(form.removed).toMatchObject({ torque: '120', pressureFront: '2,5', pressureRear: '2,7' })
    expect(toBookingRequest({ ...form, removed: { ...form.removed, kind: 'TIRES' } }, null).removed?.newSet).toMatchObject({ torque: 120, pressureFront: 2.5 })
  })

  it('another season for the new set: the values of that season follow', () => {
    const knownWinter = { ...winter, torque: 120, pressureFront: 2.5, pressureRear: 2.7 }
    const knownSummer = set('s2', { season: 'SUMMER', torque: 110, pressureFront: 2.2, pressureRear: 2.2, retrievedOn: '2026-04-02' })
    const both = tires({ inHotel: [knownWinter], outside: [knownSummer] })
    const form = { ...initialBooking(both, true, today), removedChoice: 'new' }
    expect(form.removed).toMatchObject({ season: 'SUMMER', torque: '110' })
    expect(withSet(form, 'removed', { ...form.removed, season: 'WINTER' }, both).removed).toMatchObject({ torque: '120', pressureFront: '2,5' })
  })

  it('a set stored again needs only valid depths', () => {
    const form = initialBooking(tires(), true, today)
    expect(hasErrors(bookingErrors(form, today))).toBe(false)
    const typo = { ...form, removed: { ...form.removed, depths: { ...form.removed.depths, frontLeft: 'x' } } }
    expect(bookingErrors(typo, today).removed.frontLeft).toBeTruthy()
  })

  it('brought along and taken home (FB-12): the set of the customer on, the one on the car home with them', () => {
    const own = set('o', { state: 'WITH_CUSTOMER', storedOn: null })
    const form = initialBooking(tires({ inHotel: [], outside: [summer, own] }), false, today)
    expect(form).toMatchObject({ mountedChoice: 'o', removedChoice: 's', removedTo: 'customer' })
    expect(toBookingRequest(form, 'p1')).toMatchObject({ mounted: { setId: 'o' }, removed: { setId: 's', store: false, placeId: undefined } })
  })

  it('brought, not known yet: a new set with its data and depths', () => {
    const form = initialBooking(tires({ inHotel: [], outside: [] }), false, today)
    expect(form.mountedChoice).toBe('new')
    // a new set needs its kind – here too
    expect(bookingErrors(form, today).mounted.kind).toBeTruthy()
    const filled = { ...form, mounted: { ...form.mounted, kind: 'TIRES' as const, brand: 'Muster', depths: { ...form.mounted.depths, frontLeft: '7' } } }
    expect(toBookingRequest(filled, null).mounted).toMatchObject({ newSet: { kind: 'TIRES', brand: 'Muster' }, depths: { frontLeft: 7 } })
  })

  it('a set already with the customer goes into the hotel – not home again', () => {
    const own = set('o', { season: 'SUMMER', state: 'WITH_CUSTOMER', storedOn: null })
    const form = { ...initialBooking(tires(), false, today), removedTo: 'customer' as const }
    expect(withChoice(form, 'removed', 'o', own)).toMatchObject({ removedChoice: 'o', removedTo: 'hotel', removed: { season: 'SUMMER' } })
    // the one on the car may go home
    expect(withChoice(form, 'removed', 's', summer).removedTo).toBe('customer')
  })
})
