import { describe, expect, it } from 'vitest'
import type { Customer, Vehicle } from '../customers/customerSearchApi'
import type { TireSet } from './tireHotelApi'
import { depthWarning, emptyForm, formFromSet, parseDepth, tireSetErrors, toTireSetRequest, withDepth, withKind, withSameDepth, type TireSetForm } from './tireSetForm'

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

describe('depthWarning', () => {
  it('a soft hint for unusual depths – saving stays possible', () => {
    expect(depthWarning(0)).toBe('0 mm – wirklich? Sonst Feld leer lassen')
    expect(depthWarning(12)).toBe('Ungewöhnlich viel – Tippfehler?')
    expect(depthWarning(6.5)).toBeUndefined()
    expect(depthWarning(null)).toBeUndefined()
  })
})
