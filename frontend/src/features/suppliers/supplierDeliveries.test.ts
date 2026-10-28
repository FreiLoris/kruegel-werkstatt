import { describe, expect, it } from 'vitest'
import { deliveryText, nextDeadline, type SupplierDelivery } from './supplierDeliveries'

// fictitious: three tours a day and a night express
const delivery = (more: Partial<SupplierDelivery>): SupplierDelivery => ({
  kind: 'Tagesexpress',
  orderDeadline: null,
  tour: null,
  arrival: null,
  arrivalNextDay: false,
  postage: null,
  remark: null,
  ...more,
})
const tours = [
  delivery({ orderDeadline: '13:30:00', tour: 'Tour 3', arrival: '16:00:00' }),
  delivery({ orderDeadline: '09:30:00', tour: 'Tour 1', arrival: '11:00:00' }),
  delivery({ kind: 'Nachtexpress', orderDeadline: '17:00:00', arrival: '07:30:00', arrivalNextDay: true }),
]

describe('supplierDeliveries (FB-30)', () => {
  it('the next order deadline still in reach today', () => {
    // Wednesday
    expect(nextDeadline(tours, '2026-10-28', '10:15')).toBe('Nächster Bestellschluss 13:30 – Tagesexpress (Tour 3, Ankunft ca. 16:00)')
    expect(nextDeadline(tours, '2026-10-28', '16:00')).toBe('Nächster Bestellschluss 17:00 – Nachtexpress (Ankunft ca. 07:30 am nächsten Tag)')
  })

  it('after the last one: the first of the next working day', () => {
    expect(nextDeadline(tours, '2026-10-28', '17:30')).toBe('Nächster Bestellschluss morgen 09:30 – Tagesexpress (Tour 1, Ankunft ca. 11:00)')
    // Friday evening and Saturday → Monday
    expect(nextDeadline(tours, '2026-10-30', '18:00')).toMatch(/^Nächster Bestellschluss Mo 09:30/)
    expect(nextDeadline(tours, '2026-10-31', '08:00')).toMatch(/^Nächster Bestellschluss Mo 09:30/)
  })

  it('nothing to say without an order deadline', () => {
    expect(nextDeadline([delivery({ kind: 'Abholung' })], '2026-10-28', '10:00')).toBeNull()
    expect(nextDeadline([], '2026-10-28', '10:00')).toBeNull()
  })

  it('one line per way of delivery', () => {
    expect(deliveryText(tours[2])).toBe('Nachtexpress · Bestellschluss 17:00 · Ankunft ca. 07:30 (nächster Tag)')
    expect(deliveryText(delivery({ postage: 12.5, remark: 'ab CHF 100 gratis' }))).toBe('Tagesexpress · CHF 12.50 · ab CHF 100 gratis')
  })
})
