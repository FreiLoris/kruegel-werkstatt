import { describe, expect, it } from 'vitest'
import { formatDate, formatTime, formatTimestamp } from './format'

describe('formatDate', () => {
  it('formats an ISO date in Swiss format', () => {
    expect(formatDate('2026-10-15')).toBe('15.10.2026')
  })

  it('does not shift the date because of time zones', () => {
    expect(formatDate('2026-01-01')).toBe('01.01.2026')
  })

  it('rejects invalid values', () => {
    expect(() => formatDate('15.10.2026')).toThrow()
  })
})

describe('formatTime', () => {
  it('drops the seconds', () => {
    expect(formatTime('08:00:00')).toBe('08:00')
    expect(formatTime('17:30')).toBe('17:30')
  })

  it('rejects invalid values', () => {
    expect(() => formatTime('8 Uhr')).toThrow()
  })
})

describe('formatTimestamp', () => {
  it('converts to winter time (UTC+1)', () => {
    expect(formatTimestamp('2026-01-15T07:00:00Z')).toBe('15.01.2026, 08:00')
  })

  it('converts to summer time (UTC+2)', () => {
    expect(formatTimestamp('2026-07-15T06:00:00Z')).toBe('15.07.2026, 08:00')
  })

  it('changes the date correctly after midnight', () => {
    expect(formatTimestamp('2026-10-14T22:30:00Z')).toBe('15.10.2026, 00:30')
  })

  it('rejects invalid values', () => {
    expect(() => formatTimestamp('yesterday')).toThrow()
  })
})
