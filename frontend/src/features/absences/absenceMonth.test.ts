import { describe, expect, it } from 'vitest'
import type { Absence } from './absenceApi'
import { barsOf, daysOfMonth, isBirthday, isMonth, monthTitle, overlapsAny, selectedDays, shiftMonth } from './absenceMonth'

const absence = (id: string, startDate: string, endDate: string, startsAfternoon = false, endsNoon = false) =>
  ({ id, startDate, endDate, startsAfternoon, endsNoon }) as Absence

describe('months', () => {
  it('knows its days, also in February of a leap year', () => {
    expect(daysOfMonth('2026-10')).toHaveLength(31)
    expect(daysOfMonth('2026-10')[0]).toBe('2026-10-01')
    expect(daysOfMonth('2026-10').at(-1)).toBe('2026-10-31')
    expect(daysOfMonth('2028-02')).toHaveLength(29)
  })

  it('moves over the turn of the year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-10', 0)).toBe('2026-10')
  })

  it('names the month in German and only accepts real months from the address', () => {
    expect(monthTitle('2026-03')).toBe('März 2026')
    expect(isMonth('2026-10')).toBe(true)
    expect(isMonth('2026-13')).toBe(false)
    expect(isMonth('Oktober')).toBe(false)
    expect(isMonth(null)).toBe(false)
  })
})

describe('barsOf', () => {
  it('counts half days: from noon on the first day, up to noon on the last', () => {
    const [bar] = barsOf([absence('a', '2026-10-05', '2026-10-07', true, true)], '2026-10-01', 31)

    // 5 Oct afternoon = half day 9, 7 Oct noon = half day 13
    expect(bar).toMatchObject({ start: 9, end: 13, continuesBefore: false, continuesAfter: false })
  })

  it('cuts at the edges of the month and says that it goes on', () => {
    const [bar] = barsOf([absence('a', '2026-09-28', '2026-10-02')], '2026-10-01', 31)
    const [late] = barsOf([absence('b', '2026-10-30', '2026-11-03')], '2026-10-01', 31)

    expect(bar).toMatchObject({ start: 0, end: 4, continuesBefore: true })
    expect(late).toMatchObject({ start: 58, end: 62, continuesAfter: true })
  })

  it('leaves out what is outside, sorts by start', () => {
    const bars = barsOf(
      [absence('later', '2026-10-20', '2026-10-20'), absence('before', '2026-09-01', '2026-09-30'), absence('first', '2026-10-02', '2026-10-02')],
      '2026-10-01',
      31,
    )

    expect(bars.map((b) => b.absence.id)).toEqual(['first', 'later'])
  })
})

describe('selection', () => {
  it('dragging to the left gives the same period', () => {
    expect(selectedDays('2026-10-09', '2026-10-05')).toEqual({ startDate: '2026-10-05', endDate: '2026-10-09' })
  })

  it('a morning and an afternoon on the same day do not overlap', () => {
    const morning = barsOf([absence('a', '2026-10-05', '2026-10-05', false, true)], '2026-10-01', 31)

    expect(overlapsAny(morning, 9, 10)).toBe(false)
    expect(overlapsAny(morning, 8, 10)).toBe(true)
  })
})

describe('isBirthday', () => {
  it('same day and month, any year', () => {
    expect(isBirthday('1990-10-15', '2026-10-15')).toBe(true)
    expect(isBirthday('1990-10-15', '2026-10-16')).toBe(false)
    expect(isBirthday(null, '2026-10-15')).toBe(false)
  })

  it('29 February is celebrated on 28 February when the year has no 29th', () => {
    expect(isBirthday('2000-02-29', '2026-02-28')).toBe(true)
    expect(isBirthday('2000-02-29', '2028-02-28')).toBe(false)
    expect(isBirthday('2000-02-29', '2028-02-29')).toBe(true)
  })
})
