import { describe, expect, it } from 'vitest'
import { deliveryForm, deliveryProblems, emptyContact, emptyDelivery, filledContacts, filledDeliveries, parsePostage, toDeliveries } from './supplierForm'

describe('supplierForm (FB-30)', () => {
  it('reads the postage as typed in Switzerland – and says when it cannot', () => {
    expect(parsePostage('12.50')).toBe(12.5)
    expect(parsePostage('12,50')).toBe(12.5)
    expect(parsePostage("1'000")).toBe(1000)
    expect(parsePostage('CHF 5')).toBe(5)
    expect(parsePostage(' ')).toBeNull()
    expect(parsePostage('gratis')).toBeUndefined()
    expect(parsePostage('12.505')).toBeUndefined()
  })

  it('empty rows go, filled ones stay in their order', () => {
    const contacts = [emptyContact(), { ...emptyContact(), department: 'Reifen' }]
    expect(filledContacts(contacts).map((c) => c.department)).toEqual(['Reifen'])
    expect(filledDeliveries([emptyDelivery(), { ...emptyDelivery(), tour: 'Tour 1' }])).toHaveLength(1)
  })

  it('a way of delivery needs its kind, a postage must be an amount', () => {
    const problems = deliveryProblems([{ ...emptyDelivery(), tour: 'Tour 1', postage: 'gratis' }, { ...emptyDelivery(), kind: 'Kurier' }])

    expect(problems.get(0)).toEqual({ kind: 'Art angeben, z. B. Tagesexpress', postage: 'Betrag, z. B. 12.50' })
    expect(problems.has(1)).toBe(false)
  })

  it('loaded and sent again gives the same', () => {
    const delivery = { kind: 'Nachtexpress', orderDeadline: '17:00', tour: null, arrival: '07:30', arrivalNextDay: true, postage: 12.5, remark: 'ab CHF 100 gratis' }

    expect(toDeliveries([deliveryForm({ ...delivery, orderDeadline: '17:00:00', arrival: '07:30:00' })])).toEqual([delivery])
  })
})
