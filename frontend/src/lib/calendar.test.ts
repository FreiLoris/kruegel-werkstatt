import { describe, expect, it } from 'vitest'
import { isoWeek, mondayOf, nextWorkingDay, previousWorkingDay, weekdayOf } from './calendar'

describe('calendar', () => {
  it('weekday with Monday = 0', () => {
    expect(weekdayOf('2026-10-12')).toBe(0)
    expect(weekdayOf('2026-10-18')).toBe(6)
  })

  it('Monday of the week', () => {
    expect(mondayOf('2026-10-15')).toBe('2026-10-12')
    expect(mondayOf('2026-10-18')).toBe('2026-10-12')
    expect(mondayOf('2026-11-02')).toBe('2026-11-02')
  })

  it('ISO calendar week, also around new year', () => {
    expect(isoWeek('2026-10-15')).toBe(42)
    expect(isoWeek('2027-01-01')).toBe(53)
    expect(isoWeek('2027-01-04')).toBe(1)
  })

  it('previous working day skips weekend and holidays', () => {
    // Monday → Friday
    expect(previousWorkingDay('2026-10-12', new Set())).toBe('2026-10-09')
    // Tuesday after Easter Monday 2026 → Thursday before Good Friday
    expect(previousWorkingDay('2026-04-07', new Set(['2026-04-03', '2026-04-06']))).toBe('2026-04-02')
  })

  it('next working day', () => {
    expect(nextWorkingDay('2026-10-17', new Set())).toBe('2026-10-19')
    expect(nextWorkingDay('2026-10-15', new Set())).toBe('2026-10-15')
  })
})
