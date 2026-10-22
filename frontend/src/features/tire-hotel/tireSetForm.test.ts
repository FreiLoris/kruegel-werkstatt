import { describe, expect, it } from 'vitest'
import type { Customer, Vehicle } from '../customers/customerSearchApi'
import type { TireSet } from './tireHotelApi'
import {
  depthWarning,
  emptyForm,
  formFromSet,
  mountingProposal,
  parseDepth,
  parsePressure,
  parseTorque,
  tireSetErrors,
  toTireSetRequest,
  withDepth,
  withKind,
  withMountingProposal,
  withSameDepth,
  type TireSetForm,
} from './tireSetForm'

const customer = { id: 'c1' } as Customer
const vehicle = { id: 'v1' } as Vehicle
const TODAY = '2026-10-15'

describe('a new set', () => {
  it('the season by the time of year: in autumn the summer tyres come in, in spring the winter tyres', () => {
    expect(emptyForm('2026-10-15').season).toBe('SUMMER')
    expect(emptyForm('2027-01-10').season).toBe('SUMMER')
    expect(emptyForm('2027-04-01').season).toBe('WINTER')
  })

  it('season and kind are needed, the rest may stay open', () => {
    const errors = tireSetErrors({ ...emptyForm(TODAY), season: '' }, TODAY)
    expect(Object.keys(errors).sort()).toEqual(['kind', 'season'])
  })
})

describe('depths', () => {
  it('a comma or a point, at most one decimal', () => {
    expect(parseDepth('6,5')).toBe(6.5)
    expect(parseDepth(' 4 ')).toBe(4)
    expect(parseDepth('')).toBeNull()
    // a tenth is what the gauge shows – more is rounded, not refused
    expect(parseDepth('4,25')).toBe(4.3)
    expect(parseDepth('abc')).toBeNaN()
  })

  it('"alle vier gleich": one typed depth is all of them; unticked, each wheel on its own', () => {
    const same = withDepth(emptyForm(TODAY), 'frontLeft', '6,5')
    expect(Object.values(same.depths)).toEqual(['6,5', '6,5', '6,5', '6,5'])

    const each = withDepth(withSameDepth(same, false), 'rearRight', '5')
    expect(each.depths).toEqual({ frontLeft: '6,5', frontRight: '6,5', rearLeft: '6,5', rearRight: '5' })
    expect(withSameDepth(each, true).depths.rearRight).toBe('6,5')
  })

  it('a wrong depth and a wrong year are errors at their field', () => {
    const form: TireSetForm = { ...withKind(emptyForm(TODAY), 'TIRES'), sameDepth: false, depths: { ...emptyForm(TODAY).depths, rearLeft: '25' }, year: '2030' }
    expect(tireSetErrors(form, TODAY)).toEqual({ rearLeft: 'in mm, z. B. 6,5', year: 'Jahrgang zwischen 1990 und heute, z. B. 2022' })
  })
})

describe('toTireSetRequest', () => {
  const form: TireSetForm = { ...withKind(emptyForm(TODAY), 'WHEELS'), rims: 'ALU', brand: ' Muster ', year: '2022', depths: { frontLeft: '6,5', frontRight: '6,5', rearLeft: '6', rearRight: '' }, sameDepth: false }

  it('storing: with the depths; tyres only have no rims', () => {
    expect(toTireSetRequest({ customer, vehicle: { kind: 'vehicle', vehicle } }, form)).toMatchObject({
      customerId: 'c1',
      vehicleId: 'v1',
      season: 'SUMMER',
      kind: 'WHEELS',
      rims: 'ALU',
      brand: 'Muster',
      year: 2022,
      depths: { frontLeft: 6.5, frontRight: 6.5, rearLeft: 6, rearRight: undefined },
    })
    expect(toTireSetRequest({ customer, vehicle: { kind: 'open' } }, withKind(form, 'TIRES'))).toMatchObject({ vehicleId: undefined, rims: undefined })
  })

  it('editing: the depths change by a measurement, not here', () => {
    expect(toTireSetRequest({ customer, vehicle: null }, form, 3)).toMatchObject({ depths: undefined, version: 3 })
  })

  it('a saved set comes back into the form', () => {
    const set = {
      season: 'WINTER',
      kind: 'WHEELS',
      rims: null,
      hubCaps: true,
      wheelBolts: false,
      brand: null,
      model: null,
      dimension: '205/55 R16',
      year: 2021,
      remark: null,
      depths: { frontLeft: 5.5, frontRight: 5.5, rearLeft: 5.5, rearRight: 5.5 },
    } as TireSet
    expect(formFromSet(set)).toMatchObject({ season: 'WINTER', rims: '', hubCaps: true, year: '2021', sameDepth: true })
    expect(formFromSet(set).depths.frontLeft).toBe('5,5')
  })
})

describe('torque and pressure (FB-11)', () => {
  it('optional; Nm a whole number, bar with comma or point', () => {
    expect(parseTorque('')).toBeNull()
    expect(parseTorque(' 120 ')).toBe(120)
    expect(parseTorque('12a')).toBeNaN()
    expect(parsePressure('2,5')).toBe(2.5)
    expect(parsePressure('2.75')).toBe(2.75)
    expect(parsePressure('2,555')).toBeNaN()
  })

  it('a typo is an error at its field – nothing is corrected silently', () => {
    const errors = tireSetErrors({ ...withKind(emptyForm(TODAY), 'TIRES'), torque: '5', pressureFront: '25', pressureRear: '2,7' }, TODAY)
    expect(errors).toEqual({ torque: 'in Nm, z. B. 120', pressureFront: 'in bar, z. B. 2,5' })
  })

  it('sent with the set', () => {
    const form = { ...withKind(emptyForm(TODAY), 'TIRES'), torque: '120', pressureFront: '2,5', pressureRear: '' }
    expect(toTireSetRequest({ customer, vehicle: null }, form)).toMatchObject({ torque: 120, pressureFront: 2.5, pressureRear: undefined })
  })

  it('proposed from the newest set of the car, one of the same season first', () => {
    // fictitious sets of one car
    const set = (season: string, storedOn: string, torque: number | null, pressureFront: number | null = null) =>
      ({ season, storedOn, torque, pressureFront, pressureRear: null }) as TireSet
    const sets = [set('SUMMER', '2025-10-01', 110, 2.4), set('WINTER', '2025-04-01', 120, 2.6), set('WINTER', '2026-04-01', null)]
    expect(mountingProposal(sets, 'WINTER')).toEqual({ torque: '120', pressureFront: '2,6', pressureRear: '' })
    expect(mountingProposal(sets, 'ALL_SEASON')).toEqual({ torque: '110', pressureFront: '2,4', pressureRear: '' })
    expect(mountingProposal([], 'WINTER')).toEqual({ torque: '', pressureFront: '', pressureRear: '' })
  })

  it('another car or season: the proposal follows as long as nothing was typed', () => {
    const empty = { torque: '', pressureFront: '', pressureRear: '' }
    const carA = { torque: '120', pressureFront: '2,5', pressureRear: '2,7' }
    const carB = { torque: '140', pressureFront: '2,3', pressureRear: '2,3' }
    const form = withKind(emptyForm(TODAY), 'TIRES')
    const proposed = withMountingProposal(form, empty, carA)
    expect(proposed).toMatchObject(carA)
    // car A chosen by mistake, then car B: B's values, not A's
    expect(withMountingProposal(proposed, carA, carB)).toMatchObject(carB)
    // typed by hand: stays
    expect(withMountingProposal({ ...proposed, torque: '130' }, carA, carB)).toMatchObject({ torque: '130', pressureFront: '2,5' })
    // no car any more: the proposal goes again
    expect(withMountingProposal(proposed, carA, empty)).toMatchObject(empty)
  })
})

describe('depthWarning', () => {
  it('a soft hint for unusual depths – saving stays possible', () => {
    expect(depthWarning(0)).toBe('0 mm – wirklich? Sonst Feld leer lassen')
    expect(depthWarning(12)).toBe('Ungewöhnlich viel – Tippfehler?')
    expect(depthWarning(6.5)).toBeUndefined()
    expect(depthWarning(null)).toBeUndefined()
  })
})
