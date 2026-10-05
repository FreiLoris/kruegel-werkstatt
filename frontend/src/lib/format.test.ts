import { describe, expect, it } from 'vitest'
import { addDays, formatCount, formatDate, formatLocalDateTime, formatMonth, formatTime, formatTimestamp, todayIso } from './format'

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

describe('formatCount', () => {
  it('groups thousands with the Swiss apostrophe', () => {
    expect(formatCount(1480)).toBe('1’480')
    expect(formatCount(1234567)).toBe('1’234’567')
  })

  it('leaves small numbers alone', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(999)).toBe('999')
  })
})

describe('formatMonth', () => {
  it('shows month and year', () => {
    expect(formatMonth('2026-03-15')).toBe('03.2026')
  })
})

describe('todayIso', () => {
  it('uses Swiss time – 23:30 UTC is already the next day in summer', () => {
    expect(todayIso(new Date('2026-07-14T23:30:00Z'))).toBe('2026-07-15')
  })
})

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
})

describe('formatLocalDateTime', () => {
  it('shows date and time as entered, without time zone conversion', () => {
    expect(formatLocalDateTime('2026-10-14T18:00:00')).toBe('14.10.2026, 18:00')
    expect(formatLocalDateTime('2026-03-29T02:30')).toBe('29.03.2026, 02:30')
  })
})
