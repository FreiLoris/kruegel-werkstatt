import { describe, expect, it } from 'vitest'
import type { Booking } from './bookingApi'
import { barsOf, carState, daySelection, defaultPeriod, movedByDays } from './occupancy'

const booking = (id: string, pickupAt: string, returnAt: string, returnedAt: string | null = null) =>
  ({ id, pickupAt: `${pickupAt}:00`, returnAt: `${returnAt}:00`, returnedAt: returnedAt && `${returnedAt}:00` }) as Booking

const NOW = '2026-10-15T10:00'

describe('carState', () => {
  it('overdue beats on the road beats free – returned ones do not count', () => {
    const late = booking('late', '2026-10-13T08:00', '2026-10-14T17:00')
    const out = booking('out', '2026-10-15T08:00', '2026-10-16T17:00')
    const back = booking('back', '2026-10-14T08:00', '2026-10-15T17:00', '2026-10-15T09:00')
    const later = booking('later', '2026-10-20T08:00', '2026-10-21T17:00')

    expect(carState([out, late], NOW)).toMatchObject({ kind: 'overdue', booking: { id: 'late' } })
    expect(carState([later, out], NOW)).toMatchObject({ kind: 'out', booking: { id: 'out' } })
    expect(carState([back, later], NOW)).toMatchObject({ kind: 'free', next: { id: 'later' } })
    expect(carState([], NOW)).toEqual({ kind: 'free', next: null })
  })
})

describe('barsOf', () => {
  it('places bookings in minutes from the first day, clipped at the edges', () => {
    const bars = barsOf(
      [booking('a', '2026-10-15T12:00', '2026-10-16T12:00'), booking('long', '2026-10-10T08:00', '2026-10-30T17:00')],
      '2026-10-15',
      14,
      '2026-10-14T00:00',
    )

    expect(bars).toMatchObject([
      { booking: { id: 'long' }, start: 0, end: 14 * 1440, continuesBefore: true, continuesAfter: true, state: 'out' },
      { booking: { id: 'a' }, start: 720, end: 2160, state: 'planned' },
    ])
  })

  it('an early return ends the bar, an overdue car stretches it to now', () => {
    const bars = barsOf(
      [booking('back', '2026-10-15T08:00', '2026-10-16T17:00', '2026-10-15T09:00'), booking('late', '2026-10-15T00:00', '2026-10-15T06:00')],
      '2026-10-15',
      7,
      NOW,
    )

    expect(bars.find((b) => b.booking.id === 'back')).toMatchObject({ start: 480, end: 540, state: 'returned' })
    expect(bars.find((b) => b.booking.id === 'late')).toMatchObject({ start: 0, end: 600, state: 'overdue' })
  })
})

describe('drag results', () => {
  it('days dragged open: morning of the first to evening of the last, either direction', () => {
    expect(daySelection('2026-10-17', '2026-10-15')).toEqual({ pickupAt: '2026-10-15T08:00', returnAt: '2026-10-17T17:00' })
  })

  it('moving keeps times and length', () => {
    expect(movedByDays(booking('a', '2026-10-15T12:00', '2026-10-16T09:30'), 3)).toEqual({
      pickupAt: '2026-10-18T12:00',
      returnAt: '2026-10-19T09:30',
    })
  })
})

describe('defaultPeriod', () => {
  it('from the next full hour until the evening – the next day when it is late', () => {
    expect(defaultPeriod('2026-10-15T06:20')).toEqual({ pickupAt: '2026-10-15T08:00', returnAt: '2026-10-15T17:00' })
    expect(defaultPeriod('2026-10-15T10:20')).toEqual({ pickupAt: '2026-10-15T11:00', returnAt: '2026-10-15T17:00' })
    expect(defaultPeriod('2026-10-15T15:10')).toEqual({ pickupAt: '2026-10-16T08:00', returnAt: '2026-10-16T17:00' })
  })
})
