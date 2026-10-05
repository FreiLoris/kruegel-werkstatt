import { describe, expect, it } from 'vitest'
import { timeRange, timeSeenFrom } from './taskTime'

describe('timeSeenFrom', () => {
  it('only the time on the day of the appointment, with the day otherwise', () => {
    expect(timeSeenFrom('2026-10-15', '2026-10-15T16:30:00')).toBe('16:30')
    expect(timeSeenFrom('2026-10-15', '2026-10-16T12:00:00')).toBe('Fr 16.10. 12:00')
  })
})

describe('timeRange', () => {
  it('only times on one day, with the day of the end otherwise', () => {
    expect(timeRange('2026-10-15', '08:00:00', '2026-10-15T09:30:00')).toBe('08:00–09:30')
    expect(timeRange('2026-10-15', '08:00:00', '2026-10-16T12:00:00')).toBe('08:00 – Fr 16.10. 12:00')
  })
})
